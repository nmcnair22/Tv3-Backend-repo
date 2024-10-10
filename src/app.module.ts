// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommonModule } from './common/common.module'; // If needed globally
import { BalanceSheetModule } from './modules/balance-sheet/balance-sheet.module';
import { CashFlowModule } from './modules/cash-flow/cash-flow.module';
import { DynamicsModule } from './modules/dynamics/dynamics.module';
import { FinancialDashboardModule } from './modules/financial-dashboard/financial-dashboard.module';
import { IncomeStatementsModule } from './modules/income-statements/income-statements.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigService available globally
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'mysql', // Database type
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'], // Adjust the path to your entities
        synchronize: false, // Set to true during development; false in production
        logging: true, // Enable query logging (optional)
      }),
      inject: [ConfigService],
    }),
    // Core Modules
    UserModule,
    DynamicsModule,
    CommonModule, // Include if you have global providers
    // Feature Modules
    IncomeStatementsModule,
    CashFlowModule,
    BalanceSheetModule,
    FinancialDashboardModule,
  ],
})
export class AppModule {}