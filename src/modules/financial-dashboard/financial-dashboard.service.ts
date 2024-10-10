// src/modules/financial-dashboard/financial-dashboard.service.ts

import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { FinancialDataService } from '../../common/services/financial-data.service';
import { AgedReceivableItem } from '../../common/types/aged-receivables.types';

@Injectable()
export class FinancialDashboardService {
  private readonly logger = new Logger(FinancialDashboardService.name);

  constructor(private readonly financialDataService: FinancialDataService) {}

  async getInflowsData(startDate: string, endDate: string) {
    this.logger.debug(`Fetching inflows data from ${startDate} to ${endDate}`);

    if (!startDate || !endDate) {
      throw new HttpException(
        'startDate and endDate parameters are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const data = await this.financialDataService.getInflowsData(startDate, endDate);
      return data;
    } catch (error) {
      this.logger.error(`Error in getInflowsData: ${error.message}`);
      throw new HttpException(
        'Failed to fetch inflows data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAgingReport(asOfDate: string): Promise<AgedReceivableItem[]> {
    this.logger.debug(`Fetching aging report as of ${asOfDate}`);

    if (!asOfDate) {
      throw new HttpException('asOfDate is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const data = await this.financialDataService.getAgingReport(asOfDate);
      return data;
    } catch (error) {
      this.logger.error(`Error in getAgingReport: ${error.message}`);
      throw new HttpException(
        'Failed to fetch aging report',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getCustomerPayments(customerNumber: string) {
    return this.financialDataService.getCustomerPaymentHistory(customerNumber);
  }

  async getInvoiceDetails(invoiceNumber: string) {
    return await this.financialDataService.getInvoiceDetails(invoiceNumber);
  }
}


