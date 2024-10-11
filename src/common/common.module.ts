// src/common/common.module.ts
import { Module } from '@nestjs/common';
import { DynamicsModule } from '../modules/dynamics/dynamics.module';

import { FinancialDataService } from './services/financial-data.service';
import { IncomeProcessingService } from './services/incomeProcessing.service';
import { ProductCategoryMappingService } from './services/productCategoryMapping.service';

@Module({
  imports: [DynamicsModule],
  providers: [
    FinancialDataService,
    IncomeProcessingService,
    ProductCategoryMappingService,
  ],
  exports: [
    FinancialDataService,
    IncomeProcessingService,
    ProductCategoryMappingService,
  ],
})
export class CommonModule {}
