// src/modules/financial-dashboard/financial-dashboard.controller.ts

import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Query,
} from '@nestjs/common';
import { AgedReceivableItem } from '../../common/types/aged-receivables.types';
import { PerCustomerDSOMetric } from '../../common/types/payment.types';
import { FinancialDashboardService } from './financial-dashboard.service';

@Controller('financial-dashboard')
export class FinancialDashboardController {
  private readonly logger = new Logger(FinancialDashboardController.name);

  constructor(private readonly financialDashboardService: FinancialDashboardService) {}

  @Get('inflows')
  async getInflowsData(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    try {
      return await this.financialDashboardService.getInflowsData(startDate, endDate);
    } catch (error) {
    const err = error as any;
      this.logger.error(`Error fetching inflows data: ${err.message}`);
      throw new HttpException('Failed to fetch inflows data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('dso-per-customer')
  async getDSOPerCustomer(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<PerCustomerDSOMetric[]> {
    return this.financialDashboardService.getPerCustomerDSOMetrics(startDate, endDate);
  }
  
  @Get('aging-report')
  async getAgingReport(@Query('asOfDate') asOfDate: string): Promise<AgedReceivableItem[]> {
    try {
      return await this.financialDashboardService.getAgingReport(asOfDate);
    } catch (error) {
    const err = error as any;
      this.logger.error(`Error fetching aging report: ${err.message}`);
      throw new HttpException('Failed to fetch aging report', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('customer-payments')
  async getCustomerPaymentsFromLedger(
    @Query('customerNumber') customerNumber: string,
    @Query('endDate') endDate: string,
  ) {
    try {
      return await this.financialDashboardService.getCustomerPaymentsFromLedger(customerNumber, endDate);
    } catch (error) {
    const err = error as any;
      this.logger.error(`Error fetching customer payments: ${err.message}`);
      throw new HttpException('Failed to fetch customer payments', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('invoice-details')
  async getInvoiceDetails(@Query('invoiceNumber') invoiceNumber: string) {
    try {
      return await this.financialDashboardService.getInvoiceDetails(invoiceNumber);
    } catch (error) {
    const err = error as any;
      this.logger.error(`Error fetching invoice details: ${err.message}`);
      throw new HttpException('Failed to fetch invoice details', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('dso')
  async getDSO(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    try {
      const dsoMetrics = await this.financialDashboardService.getDSOMetrics(startDate, endDate);
      const averageDSO = dsoMetrics.length > 0 ? dsoMetrics.reduce((sum, metric) => sum + metric.daysOutstanding, 0) / dsoMetrics.length : 0;
      return { dso: averageDSO };
    } catch (error) {
    const err = error as any;
      this.logger.error(`Error fetching DSO: ${err.message}`);
      throw new HttpException('Failed to fetch DSO', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('invoice-details/bulk')
  async getInvoicesDetailsBulk(@Body('invoiceNumbers') invoiceNumbers: string[]) {
    try {
      return await this.financialDashboardService.getInvoicesByNumbers(invoiceNumbers);
    } catch (error) {
    const err = error as any;
      this.logger.error(`Error fetching bulk invoice details: ${err.message}`);
      throw new HttpException('Failed to fetch invoice details', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('payments')
  async getPayments(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!startDate || !endDate) {
      throw new HttpException('startDate and endDate are required', HttpStatus.BAD_REQUEST);
    }
  
    this.logger.debug(`Received request for payments from ${startDate} to ${endDate}`);
  
    try {
      // Correct method call
      const data = await this.financialDashboardService.getCustomerPaymentsFromLedger(startDate, endDate);
      return data;
    } catch (error) {
    const err = error as any;
      this.logger.error(`Error fetching payments: ${err.message}`);
      throw new HttpException(
        'Failed to fetch payments',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('customer-payment-history')
  async getCustomerPaymentHistory(
    @Query('customerNumber') customerNumber: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Set default date range if not provided (e.g., last 6 months)
    const today = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setMonth(today.getMonth() - 6);

    const startDateParam = startDate || defaultStartDate.toISOString().split('T')[0];
    const endDateParam = endDate || today.toISOString().split('T')[0];

    return this.financialDashboardService.getCustomerPaymentHistory(customerNumber, startDateParam, endDateParam);
  }

  @Get('top-late-customers')
  async getTopLateCustomers(@Query('asOfDate') asOfDate: string) {
    return this.financialDashboardService.getTopLateCustomers(asOfDate);
  }
  
}

