// src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule'; // Import ScheduleModule
import { TypeOrmModule } from '@nestjs/typeorm';

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
import { PaymentHistoryModule } from './modules/payments/payment-history.module';
import { SyncModule } from './modules/sync/sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigService available globally
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'mysql', 
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, 
        logging: true,
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(), // Add ScheduleModule here
    // Core Modules
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
    SyncModule, // Ensure SyncModule is imported here
  ],
})
export class AppModule {}
