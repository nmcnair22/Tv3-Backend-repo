// src/modules/financial-dashboard-local/financial-dashboard-local.controller.ts

import { Controller, Get, Query } from '@nestjs/common';
import { CustomerPaymentHistoryResponse } from '../sync/dto/customer-payment-history-response.dto';
import { CreditScoreHistory, FinancialDashboardLocalService } from './financial-dashboard-local.service';

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
  ): Promise<CustomerPaymentHistoryResponse> { // Updated return type
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
  ): Promise<number> {
    const date = asOfDate ? new Date(asOfDate) : undefined;
    const result = await this.dashboardService.calculateCreditScore(customerNumber, date);
    return result.creditScore;
  }
  
  @Get('customer-credit-score-history')
  async getCustomerCreditScoreHistory(
    @Query('customerNumber') customerNumber: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('interval') interval: 'monthly' | 'weekly' | 'daily' = 'monthly',
  ): Promise<CreditScoreHistory[]> {
    const history = await this.dashboardService.getCreditScoreHistory(
      customerNumber,
      startDate,
      endDate,
      interval,
    );
    return history.map(item => ({
      customerId: customerNumber,
      date: item.date,
      score: item.creditScore,
    }));
  }
  // Define other endpoints as needed
}