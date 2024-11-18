// src/app.module.ts

import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppDataSource } from '../data-source';

// Existing modules
import { CommonModule } from './common/common.module';
import { BalanceSheetModule } from './modules/balance-sheet/balance-sheet.module';
import { CashFlowModule } from './modules/cash-flow/cash-flow.module';
import { DynamicsModule } from './modules/dynamics/dynamics.module';
import { FinancialDashboardModule } from './modules/financial-dashboard/financial-dashboard.module';
import { IncomeStatementsModule } from './modules/income-statements/income-statements.module';
import { UserModule } from './user/user.module';

// Newly added modules
import { AgingModule } from './modules/aging/aging.module';
import { BillsModule } from './modules/bills/bills.module';
import { CreditModule } from './modules/credit/credit.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DsoModule } from './modules/dso/dso.module';
import { DynamicsAccountService } from './modules/dynamics/dynamics-account.service';
import { DynamicsCustomerService } from './modules/dynamics/dynamics-customer.service';
import { FinancialDashboardLocalModule } from './modules/financial-dashboard-local/financial-dashboard-local.module';
import { PaymentHistoryModule } from './modules/payments/payment-history.module';
import { SyncModule } from './modules/sync/sync.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigService available globally
    }),
    TypeOrmModule.forRoot(AppDataSource.options),
    ScheduleModule.forRoot(), // Add ScheduleModule here
    // Core Modules
    HttpModule,
    UserModule,
    DynamicsModule,
    CommonModule,
    // Feature Modules
    IncomeStatementsModule,
    CashFlowModule,
    BalanceSheetModule,
    FinancialDashboardModule,
    // Newly Added Feature Modules
    AgingModule,
    PaymentHistoryModule,
    SyncModule,
    CreditModule,
    FinancialDashboardLocalModule,
    DsoModule,
    CustomersModule,
    BillsModule,
  ],
  providers: [DynamicsCustomerService, DynamicsAccountService],
  exports: [
    DynamicsAccountService,
    DynamicsCustomerService, // Export if needed elsewhere
    // ... other exports
  ],
})
export class AppModule {}
