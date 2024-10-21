// src/modules/aging/aging.module.ts
import { Module } from '@nestjs/common';
import { FinancialDataService } from '../../common/services/financial-data.service';
import { DynamicsModule } from '../dynamics/dynamics.module'; // Import DynamicsModule
import { AgingService } from './aging.service';

@Module({
  imports: [DynamicsModule],  // Import DynamicsModule to get access to the services
  providers: [AgingService, FinancialDataService],
  exports: [AgingService],
})
export class AgingModule {}
