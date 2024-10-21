// src/modules/payment-history/payment-history.module.ts
import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module'; // Import if FinancialDataService is provided by another module
import { FinancialDataService } from '../../common/services/financial-data.service'; // Import FinancialDataService if needed
import { AgingModule } from '../aging/aging.module'; // Import AgingModule if AgingService is used here
import { DynamicsModule } from '../dynamics/dynamics.module'; // Import DynamicsModule for DynamicsPaymentService
import { FinancialDashboardService } from '../financial-dashboard/financial-dashboard.service';
import { PaymentHistoryController } from './payment-history.controller';
import { PaymentHistoryService } from './payment-history.service';

@Module({
  imports: [DynamicsModule, AgingModule, CommonModule],  // Ensure you import the modules providing the services
  controllers: [PaymentHistoryController],
  providers: [PaymentHistoryService, FinancialDashboardService, FinancialDataService], // Include FinancialDataService
  exports: [PaymentHistoryService],
})
export class PaymentHistoryModule {}
