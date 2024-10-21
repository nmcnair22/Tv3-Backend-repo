import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AgedReceivableItem } from 'src/common/types/aged-receivables.types';
import { FinancialDataService } from '../../common/services/financial-data.service';
import { DSOMetric, PaymentCustomerLedger, PerCustomerDSOMetric } from '../../common/types/payment.types';
import { AgingService } from '../aging/aging.service';
import { DynamicsPaymentService } from '../dynamics/dynamics-payment.service';

@Injectable()
export class FinancialDashboardService {
  private readonly logger = new Logger(FinancialDashboardService.name);

  constructor(
    private readonly financialDataService: FinancialDataService,
    private readonly dynamicsPaymentService: DynamicsPaymentService,
    private readonly agingService: AgingService, // AgingService for aging report
  ) {}

  async getInflowsData(startDate: string, endDate: string) {
    this.logger.debug(`Fetching inflows data from ${startDate} to ${endDate}`);

    if (!startDate || !endDate) {
        throw new HttpException('startDate and endDate parameters are required', HttpStatus.BAD_REQUEST);
    }

    try {
        // Delegate fetching and processing to the financialDataService
        const inflowsData = await this.financialDataService.getInflowsData(startDate, endDate);

        // You may process or augment the inflowsData here if needed for the dashboard view

        return inflowsData;
    } catch (error) {
        this.logger.error(`Error in getInflowsData: ${error.message}`);
        throw new HttpException('Failed to fetch inflows data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
}

async getDSOMetrics(startDate: string, endDate: string): Promise<DSOMetric[]> {
  this.logger.debug(`Fetching DSO metrics from ${startDate} to ${endDate}`);

  if (!startDate || !endDate) {
    throw new HttpException('startDate and endDate parameters are required', HttpStatus.BAD_REQUEST);
  }

  try {
    const customerLedgerPayments: PaymentCustomerLedger[] = await this.dynamicsPaymentService.getCustomerPaymentsFromLedger(startDate, endDate);

    if (customerLedgerPayments.length === 0) {
      this.logger.warn(`No payments found for the period ${startDate} to ${endDate}`);
      return [];
    }

    const dsoMetrics: DSOMetric[] = [];

    for (const payment of customerLedgerPayments) {
      // Fetch associated invoices for each payment
      const invoices = await this.dynamicsPaymentService.getInvoicesByClosedEntryNo(payment.entryNo);

      // Filter to include only invoice entries
      const associatedInvoices = invoices.filter(invoice => invoice.documentType === 'Invoice');

      for (const invoice of associatedInvoices) {
        const daysOutstanding = this.calculateDaysBetweenDates(invoice.documentDate, payment.postingDate);

        dsoMetrics.push({
          invoiceNumber: invoice.documentNo,
          customerName: invoice.customerName,
          invoiceDate: invoice.documentDate,
          paymentDate: payment.postingDate,
          daysOutstanding,
        });
      }
    }

    this.logger.debug(`Total DSO metrics calculated: ${dsoMetrics.length}`);
    return dsoMetrics;
  } catch (error: any) {
    this.logger.error(`Error fetching DSO metrics: ${error.message}`);
    throw new HttpException('Failed to fetch DSO metrics', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

  async getPaymentsByCustomer(startDate: string, endDate: string) {
    this.logger.debug(`Fetching payments by customer from ${startDate} to ${endDate}`);

    try {
      const payments = await this.dynamicsPaymentService.getCustomerPaymentsFromLedger(startDate, endDate);

      const paymentsByCustomer = payments.reduce((acc, payment) => {
        if (!acc[payment.customerName]) {
          acc[payment.customerName] = 0;
        }
        acc[payment.customerName] += payment.amount;
        return acc;
      }, {});

      return Object.keys(paymentsByCustomer).map((customer) => ({
        customer,
        amount: paymentsByCustomer[customer],
      }));
    } catch (error) {
      this.logger.error('Error fetching payments by customer:', error.message);
      throw new Error('Failed to fetch payments by customer.');
    }
  }

  async getCustomerPaymentsFromLedger(startDate: string, endDate: string) {
    try {
      const payments = await this.dynamicsPaymentService.getCustomerPaymentsFromLedger(startDate, endDate);
      const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const paymentsByCustomer = await this.getPaymentsByCustomer(startDate, endDate);

      return {
        totalPayments,
        paymentsByCustomer,
      };
    } catch (error) {
      this.logger.error('Error fetching customer payments:', error.message);
      throw new HttpException('Failed to fetch customer payments', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getAgingReport(asOfDate: string): Promise<AgedReceivableItem[]> {
    const response = await this.agingService.getAgingReport(asOfDate); // Call to AgingService
    return response.value; // Return the 'value' array, which contains the AgedReceivableItem[]
  }

  async getInvoiceDetails(invoiceNumber: string) {
    return this.financialDataService.getInvoiceDetails(invoiceNumber); // Delegate to FinancialDataService
  }

  async getInvoicesByNumbers(invoiceNumbers: string[]) {
    return this.financialDataService.getInvoicesByNumbers(invoiceNumbers); // Delegate to FinancialDataService
  }

  private calculateDaysBetweenDates(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  async getCustomerPaymentHistory(customerNumber: string, startDate: string, endDate: string): Promise<any[]> {
    return this.financialDataService.getCustomerPaymentHistory(customerNumber, startDate, endDate);
  }

  async getPerCustomerDSOMetrics(startDate: string, endDate: string): Promise<PerCustomerDSOMetric[]> {
    this.logger.debug(`Fetching per-customer DSO metrics from ${startDate} to ${endDate}`);
  
    if (!startDate || !endDate) {
      throw new HttpException('startDate and endDate parameters are required', HttpStatus.BAD_REQUEST);
    }
  
    try {
      const customerLedgerPayments: PaymentCustomerLedger[] = await this.dynamicsPaymentService.getCustomerPaymentsFromLedger(startDate, endDate);
  
      if (customerLedgerPayments.length === 0) {
        this.logger.warn(`No payments found for the period ${startDate} to ${endDate}`);
        return [];
      }
  
      // Map to store customer DSO data
      const customerDSOMap: Map<string, { totalDays: number; count: number }> = new Map();
  
      for (const payment of customerLedgerPayments) {
        // Fetch associated invoices for each payment
        const invoices = await this.dynamicsPaymentService.getInvoicesByClosedEntryNo(payment.entryNo);
  
        // Filter to include only invoice entries
        const associatedInvoices = invoices.filter(invoice => invoice.documentType === 'Invoice');
  
        for (const invoice of associatedInvoices) {
          const daysOutstanding = this.calculateDaysBetweenDates(invoice.documentDate, payment.postingDate);
          const customerName = invoice.customerName;
  
          if (!customerDSOMap.has(customerName)) {
            customerDSOMap.set(customerName, { totalDays: 0, count: 0 });
          }
  
          const customerData = customerDSOMap.get(customerName);
          customerData.totalDays += daysOutstanding;
          customerData.count += 1;
        }
      }
  
      // Convert the map to an array of PerCustomerDSOMetric
      const perCustomerDSOMetrics: PerCustomerDSOMetric[] = Array.from(customerDSOMap.entries()).map(([customerName, data]) => ({
        customerName,
        averageDSO: data.totalDays / data.count,
      }));
  
      // Sort by average DSO descending
      perCustomerDSOMetrics.sort((a, b) => b.averageDSO - a.averageDSO);
  
      this.logger.debug(`Total customers with DSO calculated: ${perCustomerDSOMetrics.length}`);
  
      return perCustomerDSOMetrics;
    } catch (error: any) {
      this.logger.error(`Error fetching per-customer DSO metrics: ${error.message}`);
      throw new HttpException('Failed to fetch per-customer DSO metrics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getTopLateCustomers(asOfDate: string): Promise<any> {
    this.logger.debug(`Fetching top late customers as of ${asOfDate}`);

    try {
      const agingReport = await this.getAgingReport(asOfDate);

      // Exclude the total row and customers with zero amounts
      const filteredReport = agingReport.filter(
        (item) => item.name !== 'Total' && item.balanceDue > 0,
      );

      // Define periods
      const periods = [
        { key: 'period1Amount', label: '30+ Days Overdue' },
        { key: 'period2Amount', label: '60+ Days Overdue' },
        { key: 'period3Amount', label: '90+ Days Overdue' },
      ];

      const topLateCustomers = {};

      for (const period of periods) {
        const customers = filteredReport
          .filter((item) => item[period.key] > 0)
          .map((item) => ({
            customerName: item.name,
            amount: item[period.key],
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5); // Get top 5 customers per period

        topLateCustomers[period.label] = customers;
      }

      return topLateCustomers;
    } catch (error) {
      this.logger.error(`Error fetching top late customers: ${error.message}`);
      throw new HttpException('Failed to fetch top late customers', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}


