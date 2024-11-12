// src/modules/credit/credit.controller.spec.ts

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { CreditScoreHistory } from '../sync/entities/credit-score-history.entity';
import { Customer } from '../sync/entities/customer.entity';
import { SalesInvoice } from '../sync/entities/sales-invoice.entity';
import { CreditModule } from './credit.module';

describe('CreditController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Customer, CreditScoreHistory, SalesInvoice],
          synchronize: true,
        }),
        CreditModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Seed the database with a test customer and invoices
    const customerRepository = moduleFixture.get(getRepositoryToken(Customer));
    const salesInvoiceRepository = moduleFixture.get(getRepositoryToken(SalesInvoice));

    const testCustomer = customerRepository.create({
      customerNumber: '220',
      displayName: 'Tumi Inc.',
      creditScore: 750,
      creditTier: 'Good',
      totalSpend: 15000.0,
      averageMonthlySpend: 1250.0,
      onTimePayments: 20,
      earlyPayments: 5,
      latePayments: 2,
      latePayments1_30: 1,
      latePayments31_60: 0,
      latePayments61_90: 0,
      latePayments90Plus: 1,
      outstandingBalance: 5000.0,
      balanceToSpendRatio: 0.33,
    });
    await customerRepository.save(testCustomer);

    // Create some invoices
    for (let i = 0; i < 32; i++) {
      const invoice = salesInvoiceRepository.create({
        customer_number: '220',
        invoice_status: i < 5 ? 'Open' : 'Paid', // 5 open invoices
        // ... other fields as needed
      });
      await salesInvoiceRepository.save(invoice);
    }
  });

  it('/customers/:customerNumber/credit-score (GET)', () => {
    return request(app.getHttpServer())
      .get('/customers/220/credit-score')
      .expect(200)
      .expect({
        customerNumber: '220',
        creditScore: 750,
        creditTier: 'Good',
        totalSpend: 15000.0,
        averageMonthlySpend: 1250.0,
        outstandingBalance: 5000.0,
        balanceToSpendRatio: 0.33,
      });
  });

  it('/customers/:customerNumber/credit-score/history (GET)', () => {
    return request(app.getHttpServer())
      .get('/customers/220/credit-score/history')
      .expect(200)
      .expect([
        {
          creditScore: 750,
          creditTier: 'Good',
          recordedAt: expect.any(String),
          totalSpend: 15000.0,
          averageMonthlySpend: 1250.0,
          outstandingBalance: 5000.0,
          balanceToSpendRatio: 0.33,
        },
        // ... more records if available
      ]);
  });

  afterAll(async () => {
    await app.close();
  });
});
