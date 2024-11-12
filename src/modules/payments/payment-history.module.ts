// src/modules/payments/payment-history.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialDataService } from '../../common/services/financial-data.service';
import { AgingModule } from '../aging/aging.module';
import { DynamicsModule } from '../dynamics/dynamics.module';
import { FinancialDashboardService } from '../financial-dashboard/financial-dashboard.service';
import { Customer } from '../sync/entities/customer.entity';
import { PaymentHistory } from '../sync/entities/payment-history.entity';
import { SalesInvoice } from '../sync/entities/sales-invoice.entity';
import { PaymentHistoryController } from './payment-history.controller';
import { PaymentHistoryService } from './payment-history.service';

@Module({
  imports: [
    DynamicsModule,
    AgingModule,
    TypeOrmModule.forFeature([PaymentHistory, SalesInvoice, Customer]),
    // Other necessary modules
  ],
  controllers: [PaymentHistoryController],
  providers: [PaymentHistoryService, FinancialDashboardService, FinancialDataService],
  exports: [PaymentHistoryService, TypeOrmModule], // Export TypeOrmModule here
})
export class PaymentHistoryModule {}
