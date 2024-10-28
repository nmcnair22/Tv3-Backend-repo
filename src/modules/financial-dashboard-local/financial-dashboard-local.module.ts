// src/modules/financial-dashboard-local/financial-dashboard-local.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../sync/entities/account.entity';
import { CustomerLedgerEntry } from '../sync/entities/customer-ledger-entry.entity';
import { Customer } from '../sync/entities/customer.entity';
import { GeneralLedgerEntry } from '../sync/entities/general-ledger-entry.entity';
import { SalesCreditMemo } from '../sync/entities/sales-credit-memo.entity';
import { SalesInvoiceLine } from '../sync/entities/sales-invoice-line.entity';
import { SalesInvoice } from '../sync/entities/sales-invoice.entity';
import { FinancialDashboardLocalController } from './financial-dashboard-local.controller';
import { FinancialDashboardLocalService } from './financial-dashboard-local.service';

import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { DynamicsAuthService } from '../dynamics/dynamics-auth.service';
import { DynamicsReportsService } from '../dynamics/dynamics-reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Account,
      Customer,
      CustomerLedgerEntry,
      GeneralLedgerEntry,
      SalesCreditMemo,
      SalesInvoice,
      SalesInvoiceLine,
      // ... other entities
    ]),
    HttpModule, // Added to provide HttpService
    ConfigModule, // Added to provide ConfigService
  ],
  controllers: [FinancialDashboardLocalController],
  providers: [
    FinancialDashboardLocalService,
    DynamicsReportsService,
    DynamicsAuthService,
  ],
})
export class FinancialDashboardLocalModule {}
