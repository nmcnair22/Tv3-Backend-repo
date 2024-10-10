// src/modules/financial-dashboard/financial-dashboard.controller.ts

import { Controller, Get, HttpException, HttpStatus, Logger, Query } from '@nestjs/common';
import { AgedReceivableItem } from '../../common/types/aged-receivables.types';
import { FinancialDashboardService } from './financial-dashboard.service';

@Controller('financial-dashboard')
export class FinancialDashboardController {
  private readonly logger = new Logger(FinancialDashboardController.name);

  constructor(private readonly financialDashboardService: FinancialDashboardService) {}

  @Get('inflows')
  async getInflowsData(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    this.logger.debug(`Received request for inflows data from ${startDate} to ${endDate}`);

    try {
      const data = await this.financialDashboardService.getInflowsData(startDate, endDate);
      return data;
    } catch (error) {
      this.logger.error(`Error fetching inflows data: ${error.message}`);
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('aging-report')
  async getAgingReport(@Query('asOfDate') asOfDate: string): Promise<AgedReceivableItem[]> {
    if (!asOfDate) {
      throw new HttpException('asOfDate is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const data = await this.financialDashboardService.getAgingReport(asOfDate);
      return data;
    } catch (error) {
      this.logger.error(`Error fetching aging report: ${error.message}`);
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('customer-payments')
  async getCustomerPayments(
    @Query('customerNumber') customerNumber: string,
  ) {
    return this.financialDashboardService.getCustomerPayments(customerNumber);
  }

  @Get('invoice-details')
  async getInvoiceDetails(@Query('invoiceNumber') invoiceNumber: string) {
    if (!invoiceNumber) {
      throw new HttpException('invoiceNumber is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const data = await this.financialDashboardService.getInvoiceDetails(invoiceNumber);
      return data;
    } catch (error) {
      this.logger.error(`Error fetching invoice details: ${error.message}`);
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

