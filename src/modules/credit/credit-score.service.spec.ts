// src/modules/credit/credit-score.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditScoreHistory } from '../sync/entities/credit-score-history.entity';
import { Customer } from '../sync/entities/customer.entity';
import { SalesInvoice } from '../sync/entities/sales-invoice.entity';
import { CreditScoreService } from './credit-score.service';

describe('CreditScoreService', () => {
  let service: CreditScoreService;
  let customerRepository: Repository<Customer>;
  let creditScoreHistoryRepository: Repository<CreditScoreHistory>;
  let salesInvoiceRepository: Repository<SalesInvoice>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditScoreService,
        {
          provide: getRepositoryToken(Customer),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(CreditScoreHistory),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(SalesInvoice),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<CreditScoreService>(CreditScoreService);
    customerRepository = module.get<Repository<Customer>>(getRepositoryToken(Customer));
    creditScoreHistoryRepository = module.get<Repository<CreditScoreHistory>>(getRepositoryToken(CreditScoreHistory));
    salesInvoiceRepository = module.get<Repository<SalesInvoice>>(getRepositoryToken(SalesInvoice));
  });

  it('should calculate credit score correctly', async () => {
    const mockCustomer = {
      customerNumber: '220',
      onTimePayments: 20,
      earlyPayments: 5,
      latePayments: 2,
      latePayments1_30: 1,
      latePayments31_60: 0,
      latePayments61_90: 0,
      latePayments90Plus: 1,
      totalSpend: 15000.0,
      averageMonthlySpend: 1250.0,
      outstandingBalance: 5000.0,
      balanceToSpendRatio: 0.33,
    } as Customer;

    jest.spyOn(customerRepository, 'find').mockResolvedValue([mockCustomer]);
    jest.spyOn(salesInvoiceRepository, 'count').mockResolvedValue(32); // Example invoice count
    jest.spyOn(salesInvoiceRepository, 'count').mockResolvedValueOnce(32).mockResolvedValueOnce(5); // total and open invoices

    const creditScoreData = service['calculateCreditScoreForCustomer'](mockCustomer, 32, 5);

    expect(creditScoreData.creditScore).toBe(600 + (20 * 5) + (5 * 3) - (2 * 10) - (1 * 20) + Math.min(0.33 * 10, 50) - (32 * 0.5) - (5 * 2));
    expect(creditScoreData.creditTier).toBe('Good');
    // Add more assertions as needed
  });
});
