// src/modules/financial-dashboard-local/financial-dashboard-local.controller.ts

import { Controller, Get, Query } from '@nestjs/common';
import { FinancialDashboardLocalService } from './financial-dashboard-local.service';

@Controller('api/local/financial-dashboard')
export class FinancialDashboardLocalController {
  constructor(private readonly dashboardService: FinancialDashboardLocalService) {}

  @Get('inflows-data')
  async getInflowsData(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    const data = await this.dashboardService.getInflowsData(startDate, endDate);
    return data;
  }

  // Define other endpoints as needed
}