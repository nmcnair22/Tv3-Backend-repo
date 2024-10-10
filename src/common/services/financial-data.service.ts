// src/services/financial-data.service.ts

import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { DynamicsService } from '../../modules/dynamics/dynamics.service';
import { AgedReceivableItem } from '../types/aged-receivables.types';

@Injectable()
export class FinancialDataService {
  private readonly logger = new Logger(FinancialDataService.name);

  constructor(private readonly dynamicsService: DynamicsService) {}

  /**
   * Retrieves all necessary inflows data for the dashboard within the specified date range.
   * @param startDate - The start date in 'YYYY-MM-DD' format.
   * @param endDate - The end date in 'YYYY-MM-DD' format.
   * @returns An object containing inflows data.
   */
  async getInflowsData(startDate: string, endDate: string): Promise<any> {
    this.logger.debug(`Fetching inflows data from ${startDate} to ${endDate}`);

    // Fetch starting and ending receivables from balance sheet
    const [startingReceivables, endingReceivables] = await Promise.all([
      this.getReceivablesForDate(startDate),
      this.getReceivablesForDate(endDate),
    ]);

    const netChangeReceivables = endingReceivables - startingReceivables;

    this.logger.debug(`Starting Receivables: ${startingReceivables}`);
    this.logger.debug(`Ending Receivables: ${endingReceivables}`);
    this.logger.debug(`Net Change in Receivables: ${netChangeReceivables}`);

    // Fetch posted sales invoices within the date range
    const postedInvoices = await this.dynamicsService.getInvoices(startDate, endDate);

    this.logger.debug(`Fetched ${postedInvoices.length} posted invoices`);

    // Fetch income accounts to map account numbers to categories
    const incomeAccounts = await this.dynamicsService.getIncomeAccounts();
    const accountNumberToDisplayName = new Map<string, string>();
    incomeAccounts.forEach((account) => {
      accountNumberToDisplayName.set(
        account.number,
        account.displayName || 'Uncategorized Income'
      );
    });

    // Log the income accounts mapping for debugging
    this.logger.debug(`Income Accounts Mapping: ${JSON.stringify(Array.from(accountNumberToDisplayName.entries()))}`);

    // Fetch invoice lines and categorize revenue
    const revenueCategories = new Map<string, number>();

    for (const invoice of postedInvoices) {
      const invoiceLines = await this.dynamicsService.getInvoiceLines(invoice.id);
      this.logger.debug(`Fetched ${invoiceLines.length} lines for invoice ${invoice.number}`);

      // Fetch GL entries for the invoice to determine the correct account number
      const glEntries = await this.dynamicsService.getGLEntriesByDocumentNumber(invoice.number);
      if (glEntries.length > 0) {
        // Filter GL entries to find the one with a credit amount (representing income)
        const creditGLEntry = glEntries.find((entry) => entry.creditAmount > 0);

        if (creditGLEntry) {
          const accountNumber = creditGLEntry.accountNumber;
          const categoryName = accountNumberToDisplayName.get(accountNumber) || 'Uncategorized Income';

          this.logger.debug(`GL Entry Account Number: ${accountNumber}, Category: ${categoryName}`);

          for (const line of invoiceLines) {
            const amount = line.netAmount || 0;

            // Properly map account numbers to category names
            this.logger.debug(`Mapping line amount ${amount} to category ${categoryName} for account number ${accountNumber}`);

            const currentAmount = revenueCategories.get(categoryName) || 0;
            revenueCategories.set(categoryName, currentAmount + amount);
          }
        } else {
          this.logger.warn(`No credit GL entry found for invoice number ${invoice.number}`);
        }
      } else {
        this.logger.warn(`No GL entries found for invoice number ${invoice.number}`);
      }
    }

    // Log the revenue categories for debugging
    this.logger.debug(`Revenue Categories: ${JSON.stringify(Array.from(revenueCategories.entries()))}`);

    // Calculate total new invoices (total revenue)
    const totalNewInvoices = Array.from(revenueCategories.values()).reduce(
      (sum, amount) => sum + amount,
      0
    );

    this.logger.debug(`Total New Invoices (Total Revenue): ${totalNewInvoices}`);

    // Fetch payments from General Ledger entries within the date range
    const paymentsFromGL = await this.dynamicsService.getCustomerPaymentsFromGL(startDate, endDate);
    const totalPaymentsReceived = paymentsFromGL.reduce(
      (sum, payment) => sum + (payment.creditAmount || 0),
      0
    );

    this.logger.debug(`Total Payments Received from GL: ${totalPaymentsReceived}`);

    // Group payments by customer
    const paymentsByCustomer = new Map<string, number>();
    paymentsFromGL.forEach((payment) => {
      const customerName = payment.description || 'Unknown';
      const amount = payment.creditAmount || 0;

      const currentAmount = paymentsByCustomer.get(customerName) || 0;
      paymentsByCustomer.set(customerName, currentAmount + amount);
    });

    // Log the payments by customer for debugging
    this.logger.debug(`Payments By Customer: ${JSON.stringify(Array.from(paymentsByCustomer.entries()))}`);

    // Prepare the data to return
    return {
      startingReceivables,
      endingReceivables,
      netChangeReceivables,
      totalNewInvoices,
      totalPaymentsReceived,
      revenueCategories: Array.from(revenueCategories.entries()).map(
        ([category, amount]) => ({
          category,
          amount,
        })
      ),
      paymentsByCustomer: Array.from(paymentsByCustomer.entries()).map(
        ([customer, amount]) => ({
          customer,
          amount,
        })
      ),
    };
  }

  async getCustomerPaymentHistory(customerNumber: string): Promise<any[]> {
    try {
      const today = new Date();
      const sevenMonthsAgo = new Date();
      sevenMonthsAgo.setMonth(today.getMonth() - 7);
  
      const startDate = sevenMonthsAgo.toISOString().split('T')[0]; // 'YYYY-MM-DD'
      const endDate = today.toISOString().split('T')[0];
  
      // Step 1: Fetch invoices for the customer over the last 7 months
      const invoices = await this.dynamicsService.getInvoicesByCustomer(
        customerNumber,
        startDate,
        endDate,
      );
  
      const invoiceNumbers = invoices.map((invoice) => invoice.number);
  
      if (invoiceNumbers.length === 0) {
        this.logger.debug(`No invoices found for customer ${customerNumber}`);
        return [];
      }
  
      // Step 2: Fetch payments associated with those invoices
      const payments = await this.dynamicsService.getPaymentsByInvoiceNumbers(
        invoiceNumbers,
        startDate, // Use startDate of invoices
        endDate,
      );
  
      if (payments.length === 0) {
        this.logger.debug(`No payments found for customer ${customerNumber}`);
        return [];
      }
  
      this.logger.debug(`Fetched payments: ${JSON.stringify(payments, null, 2)}`);
  
      // Step 3: Map payments to the required format
    const paymentHistory = payments.map((payment) => ({
      amount: payment.debitAmount || 0,
      date: payment.postingDate,
      invoiceNumber: payment.documentNumber,
    }));

    return paymentHistory;
  } catch (error) {
    this.logger.error(
      `Error fetching payment history for customer ${customerNumber}: ${error.message}`,
    );
    throw error;
  }
}

  /**
   * Fetches receivables for a specific date from the balance sheet report.
   * @param date - The date in 'YYYY-MM-DD' format.
   * @returns The receivable amount.
   */
  private async getReceivablesForDate(date: string): Promise<number> {
    this.logger.debug(`Fetching receivables for date: ${date}`);

    try {
      const balanceSheet = await this.dynamicsService.getBalanceSheetStatements(date);

      this.logger.debug(`Balance sheet data fetched for date: ${date}: ${JSON.stringify(balanceSheet)}`);

      // Extract "Total Accounts Receivable"
      const receivableLine = balanceSheet.value.find((item) =>
        item.display.toLowerCase().includes('total accounts receivable')
      );

      if (receivableLine) {
        // Access the correct property based on availability
        const receivableAmount = receivableLine.balance ?? 0;

        this.logger.debug(`Total Accounts Receivable for ${date}: ${receivableAmount}`);
        return receivableAmount;
      } else {
        this.logger.warn(`Total Accounts Receivable not found in balance sheet for ${date}`);
        return 0;
      }
    } catch (error) {
      this.logger.error(`Error fetching receivables for date ${date}: ${error.message}`);
      throw error;
    }
  }
  /**
   * Retrieves the aging report using the agedAccountsReceivables endpoint.
   * @param asOfDate - The date to calculate the aging as of.
   * @returns An array of aged receivables.
   */
  async getAgingReport(asOfDate: string): Promise<AgedReceivableItem[]> {
    try {
      const agedReceivables = await this.dynamicsService.getAgedReceivables(asOfDate);
      this.logger.debug(`Retrieved ${agedReceivables.length} aged receivables records.`);
  
      // Optional: Filter out customers with zero balance due
      const receivablesWithBalance = agedReceivables.filter(item => item.balanceDue > 0);
  
      // Map the data to ensure consistency
      const receivables = receivablesWithBalance.map(item => ({
        ...item,
        customerName: item.name, // Map 'name' to 'customerName' if needed
      }));
  
      return receivables;
    } catch (error) {
      this.logger.error(`Error fetching aging report: ${error.message}`);
      throw new HttpException(
        'Failed to fetch aging report',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

   // Method to get invoice details and lines
   async getInvoiceDetails(invoiceNumber: string): Promise<any> {
    try {
      // Fetch the invoice
      const invoice = await this.dynamicsService.getInvoiceByNumber(invoiceNumber);

      if (!invoice) {
        throw new Error(`Invoice with number ${invoiceNumber} not found`);
      }

      // Fetch the invoice lines
      const invoiceLines = await this.dynamicsService.getInvoiceLinesByInvoiceId(invoice.id);

      return {
        invoice,
        invoiceLines,
      };
    } catch (error) {
      this.logger.error(`Error fetching invoice details: ${error.message}`);
      throw error;
    }
  }
}


