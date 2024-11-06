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
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    return this.dashboardService.getCustomerPaymentHistory(
      customerNumber,
      startDate,
      endDate,
    );
  }

  @Get('customer-credit-score')
  async getCustomerCreditScore(
    @Query('customerNumber') customerNumber: string,
    @Query('asOfDate') asOfDate?: string,
  ): Promise<any> {
    const date = asOfDate ? new Date(asOfDate) : undefined;
    return this.dashboardService.calculateCreditScore(customerNumber, date);
  }
  
  @Get('customer-credit-score-history')
  async getCustomerCreditScoreHistory(
    @Query('customerNumber') customerNumber: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('interval') interval: 'monthly' | 'weekly' | 'daily' = 'monthly',
  ): Promise<any> {
    return this.dashboardService.getCreditScoreHistory(
      customerNumber,
      startDate,
      endDate,
      interval,
    );
  }
  // Define other endpoints as needed
}