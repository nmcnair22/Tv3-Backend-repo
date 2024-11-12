// src/modules/credit/credit.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentHistoryModule } from '../payments/payment-history.module'; // Import PaymentHistoryModule
import { CreditScoreHistory } from '../sync/entities/credit-score-history.entity';
import { CustomerLedgerEntry } from '../sync/entities/customer-ledger-entry.entity';
import { Customer } from '../sync/entities/customer.entity';
import { GeneralLedgerEntry } from '../sync/entities/general-ledger-entry.entity';
import { SalesInvoiceLine } from '../sync/entities/sales-invoice-line.entity';
import { SalesInvoice } from '../sync/entities/sales-invoice.entity';
import { CreditScoreService } from './credit-score.service';
import { CreditController } from './credit.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      CreditScoreHistory,
      SalesInvoice,
      SalesInvoiceLine,
      CustomerLedgerEntry,
      GeneralLedgerEntry,
    ]),
    PaymentHistoryModule, // Include PaymentHistoryModule here
    // ... other necessary modules
  ],
  controllers: [CreditController],
  providers: [CreditScoreService],
  exports: [CreditScoreService],
})
export class CreditModule {}