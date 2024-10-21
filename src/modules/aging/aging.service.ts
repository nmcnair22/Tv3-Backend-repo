// src/modules/aging/aging.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { FinancialDataService } from '../../common/services/financial-data.service';
import { AgedReceivableItem, AgedReceivablesResponse } from '../../common/types/aged-receivables.types';

@Injectable()
export class AgingService {
  private readonly logger = new Logger(AgingService.name);

  constructor(private readonly financialDataService: FinancialDataService) {}

  /**
   * Fetches the aging report for customers as of a specific date.
   * @param asOfDate - The date in 'YYYY-MM-DD' format.
   * @returns Aging report data structured by customer, including overdue balances.
   */
  async getAgingReport(asOfDate: string): Promise<AgedReceivablesResponse> {
    this.logger.debug(`Fetching aging report as of ${asOfDate}`);
    try {
      // Fetch aging data from the financial data service
      const agingData: AgedReceivableItem[] = await this.financialDataService.getAgingReport(asOfDate);

      // Process aging data if necessary
      const processedData = agingData.map((customer) => ({
        '@odata.etag': customer['@odata.etag'],
        customerId: customer.customerId,
        customerNumber: customer.customerNumber,
        name: customer.name,
        currencyCode: customer.currencyCode,
        balanceDue: customer.balanceDue || 0,
        currentAmount: customer.currentAmount || 0,
        period1Label: customer.period1Label,
        period1Amount: customer.period1Amount || 0,
        period2Label: customer.period2Label,
        period2Amount: customer.period2Amount || 0,
        period3Label: customer.period3Label,
        period3Amount: customer.period3Amount || 0,
        agedAsOfDate: customer.agedAsOfDate,
        periodLengthFilter: customer.periodLengthFilter,
      }));

      this.logger.debug('Processed aging data:', processedData);

      // Wrap the processed data in an AgedReceivablesResponse object
      const agingResponse: AgedReceivablesResponse = {
        value: processedData,
      };

      return agingResponse;
    } catch (error) {
      this.logger.error('Error fetching aging report:', error.message);
      throw new Error('Failed to fetch aging report.');
    }
  }
}
