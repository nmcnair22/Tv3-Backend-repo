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

  @Get('activity-feed')
  async getActivityFeed() {
    const activities = await this.dashboardService.getRecentActivities();
    return activities;
  }

  @Get('new-activities')
  async getNewActivities() {
    const activities = await this.dashboardService.getNewActivities();
    return activities;
  }

  @Get('customer-payment-history')
  async getCustomerPaymentHistory(
    @Query('customerNumber') customerNumber: string,
    @Query('startDate') startDate: string, // Optional
    @Query('endDate') endDate: string, // Optional
  ) {
    // You can add validation for customerNumber here if needed
    return this.dashboardService.getCustomerPaymentHistory(customerNumber, startDate, endDate);
  }

  // Define other endpoints as needed
}