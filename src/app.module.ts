// src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

// Existing modules
import { HttpModule } from '@nestjs/axios';
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
import { JobsModule } from './modules/jobs/jobs.module';
import { PaymentHistoryModule } from './modules/payments/payment-history.module';
import { SyncModule } from './modules/sync/sync.module';

// Import entities for multiple database connections
import { TemMasterViewUpdated } from './modules/bills/entities/tem-master-view-updated.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Default database connection for your local development database
    TypeOrmModule.forRootAsync({
      name: 'default', // Default connection name
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST') || 'localhost',
        port: parseInt(configService.get<string>('DB_PORT'), 10) || 3306,
        username: configService.get<string>('DB_USERNAME') || 'root',
        password: configService.get<string>('DB_PASSWORD') || 'password',
        database:
          configService.get<string>('DB_DATABASE') || 'business_central_db',
        entities: [__dirname + '/modules/**/*.entity{.ts,.js}'],
        synchronize: false, // Set to true for development, false for production
        logging: false,
        timezone: 'Z',
        extra: {
          dateStrings: false,
        },
      }),
      inject: [ConfigService],
    }),
    // TEM database connection for the production database
    TypeOrmModule.forRootAsync({
      name: 'temConnection',
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('TEM_DB_HOST'),
        port: parseInt(configService.get<string>('TEM_DB_PORT'), 10) || 3306,
        username: configService.get<string>('TEM_DB_USERNAME'),
        password: configService.get<string>('TEM_DB_PASSWORD'),
        database: configService.get<string>('TEM_DB_DATABASE'),
        entities: [TemMasterViewUpdated], // Import the TEM entity
        synchronize: false, // Important: Disable synchronization for production DB
        logging: false,
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
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
    JobsModule,
  ],
  providers: [
    DynamicsCustomerService,
    DynamicsAccountService,
    // ... other global providers if any
  ],
  exports: [
    DynamicsCustomerService,
    DynamicsAccountService,
    // ... other exports if necessary
  ],
})
export class AppModule {}
