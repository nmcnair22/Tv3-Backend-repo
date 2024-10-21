// src/modules/financial-dashboard/financial-dashboard.module.ts

import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Importing Common Services
import { FinancialDataService } from '../../common/services/financial-data.service';

// Importing Financial Dashboard Components
import { FinancialDashboardController } from './financial-dashboard.controller';
import { FinancialDashboardService } from './financial-dashboard.service';

// Importing Aging Module for AgingService
import { AgingModule } from '../aging/aging.module'; // Import AgingModule to use AgingService

// Import DynamicsModule
import { DynamicsModule } from '../dynamics/dynamics.module';

@Module({
  imports: [
    HttpModule,    // For making HTTP requests to external APIs
    ConfigModule,  // For managing environment configurations
    AgingModule,   // Importing AgingModule to provide AgingService
    DynamicsModule, // Import DynamicsModule to access its providers
  ],
  controllers: [
    FinancialDashboardController, // Registering the updated controller
  ],
  providers: [
    // Financial Dashboard Services
    FinancialDashboardService,

    // Common Services
    FinancialDataService,

    // Remove Dynamics services from providers
    // These are provided by DynamicsModule
  ],
  exports: [
    // Export services if they need to be used in other modules
    FinancialDashboardService,
    // ...any other exports
  ],
})
export class FinancialDashboardModule {}