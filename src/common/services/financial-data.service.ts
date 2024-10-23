// src/common/services/financial-data.service.ts

import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Invoice, InvoiceLine } from '../../common/types/invoice.types';
import { DynamicsAccountService } from '../../modules/dynamics/dynamics-account.service';
import { DynamicsCreditService } from '../../modules/dynamics/dynamics-credit.service';
import { DynamicsGlEntryService } from '../../modules/dynamics/dynamics-glentry.service';
import { DynamicsInvoiceService } from '../../modules/dynamics/dynamics-invoice.service';
import { DynamicsPaymentService } from '../../modules/dynamics/dynamics-payment.service';
import { DynamicsReportsService } from '../../modules/dynamics/dynamics-reports.service';
import { AgedReceivableItem } from '../types/aged-receivables.types';

interface PaymentHistoryRecord {
  paymentDate: string;
  paymentAmount: number;
  description: string;
  paymentEntryNo: number;
  relatedInvoices: {
    invoiceNumber: string;
    invoiceDate: string;
    amount: number;
  }[];
}

@Injectable()
export class FinancialDataService {
  private readonly logger = new Logger(FinancialDataService.name);

  constructor(
    private readonly dynamicsReportsService: DynamicsReportsService,
    private readonly dynamicsInvoiceService: DynamicsInvoiceService,
    private readonly dynamicsAccountService: DynamicsAccountService,
    private readonly dynamicsGlEntryService: DynamicsGlEntryService,
    private readonly dynamicsPaymentService: DynamicsPaymentService,
    private readonly dynamicsCreditService: DynamicsCreditService,
  ) {}

/**
 * Retrieves all necessary inflows data for the dashboard within the specified date range.
 * @param startDate - The start date in 'YYYY-MM-DD' format.
 * @param endDate - The end date in 'YYYY-MM-DD' format.
 * @returns An object containing inflows data.
 */
async getInflowsData(startDate: string, endDate: string): Promise<{
  startingReceivables: number;
  endingReceivables: number;
  netChangeReceivables: number;
  totalNewInvoices: number;
  totalCredits: number;
  totalPaymentsReceived: number;
  revenueCategories: { category: string; amount: number }[];
  paymentsByCustomer: {
    customer: string;
    amount: number;
    payments: {
      amount: number;
      postingDate: string;
      documentNo: string;
      description: string;
      // Include other fields as needed
    }[];
  }[];
}> {
  this.logger.debug(`Fetching inflows data from ${startDate} to ${endDate}`);

  // Step 1: Fetch starting and ending receivables from balance sheet
  const [startingReceivables, endingReceivables] = await Promise.all([
    this.getReceivablesForDate(startDate),
    this.getReceivablesForDate(endDate),
  ]);

  const netChangeReceivables = endingReceivables - startingReceivables;

  // Step 2: Fetch posted sales invoices within the date range
  const postedInvoices = await this.dynamicsInvoiceService.getInvoices(startDate, endDate);

  // Step 3: Fetch income accounts and map account numbers to categories
  const incomeAccounts = await this.dynamicsAccountService.getIncomeAccounts();
  const accountNumberToDisplayName = new Map<string, string>();
  incomeAccounts.forEach((account) => {
    accountNumberToDisplayName.set(
      account.number,
      account.displayName || 'Uncategorized Income',
    );
  });

  // Step 4: Fetch and categorize revenue by account number from invoices and GL entries
  const revenueCategories = new Map<string, number>();
  for (const invoice of postedInvoices) {
    const creditGLEntries = await this.dynamicsGlEntryService.getGLEntriesByDocumentNumber(invoice.number);
    for (const glEntry of creditGLEntries) {
      const accountNumber = glEntry.accountNumber;
      const categoryName = accountNumberToDisplayName.get(accountNumber) || 'Uncategorized Income';
      const currentAmount = revenueCategories.get(categoryName) || 0;
      revenueCategories.set(categoryName, currentAmount + (glEntry.creditAmount || 0));
    }
  }

  const totalNewInvoices = Array.from(revenueCategories.values()).reduce((sum, amount) => sum + amount, 0);

  // Step 5: Fetch payments from the ledger (Customer Ledger Entries)
  const paymentsFromLedger = await this.dynamicsPaymentService.getCustomerPaymentsFromLedger(startDate, endDate);
  const totalPaymentsReceived = paymentsFromLedger.reduce((sum, payment) => sum + (payment.creditAmount || 0), 0);

  // Step 6: Fetch TEM payments from GL entries
  const TEMPayments = await this.dynamicsGlEntryService.getTEMPayments(startDate, endDate);
  const totalTEMPayments = TEMPayments.reduce((sum, payment) => sum + (payment.creditAmount || 0), 0);

  // Step 7: Group payments by customer and include payment details
  const paymentsByCustomerMap = new Map<string, { amount: number; payments: any[] }>();

  paymentsFromLedger.forEach((payment) => {
    const customerName = payment.customerName || 'Unknown';
    const amount = payment.creditAmount || 0;

    if (!paymentsByCustomerMap.has(customerName)) {
      paymentsByCustomerMap.set(customerName, { amount: 0, payments: [] });
    }

    const customerData = paymentsByCustomerMap.get(customerName);
    customerData.amount += amount;
    customerData.payments.push({
      amount: amount,
      postingDate: payment.postingDate,
      documentNo: payment.documentNo,
      description: payment.description,
      // Include other fields as needed
    });
  });

  // Step 8: Fetch total credits during the period
  const totalCredits = await this.getTotalCredits(startDate, endDate);

  // Step 9: Convert Map to Array for paymentsByCustomer
  const paymentsByCustomer = Array.from(paymentsByCustomerMap.entries()).map(([customer, data]) => ({
    customer,
    amount: data.amount,
    payments: data.payments,
  }));

  // Step 10: Return the full inflows data
  return {
    startingReceivables,
    endingReceivables,
    netChangeReceivables,
    totalNewInvoices,
    totalCredits,
    totalPaymentsReceived,
    revenueCategories: Array.from(revenueCategories.entries()).map(([category, amount]) => ({
      category,
      amount,
    })),
    paymentsByCustomer,
    // Optionally include totalTEMPayments if needed
    // totalTEMPayments,
  };
}

  /**
   * Retrieves the aging report using the agedAccountsReceivables endpoint.
   * @param asOfDate - The date to calculate the aging as of.
   * @returns An array of aged receivables.
   */
  async getAgingReport(asOfDate: string): Promise<AgedReceivableItem[]> {
    try {
      const agedReceivables =
        await this.dynamicsReportsService.getAgedReceivables(asOfDate);
      this.logger.debug(`Retrieved ${agedReceivables.length} aged receivables records.`);

      return agedReceivables;
    } catch (error) {
    const err = error as any;
      this.logger.error(`Error fetching aging report: ${err.message}`);
      throw new HttpException('Failed to fetch aging report', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

 /**
   * Retrieves the payment history for a specific customer.
   * @param customerNumber - The customer number.
   * @param startDate - Start date in 'YYYY-MM-DD' format.
   * @param endDate - End date in 'YYYY-MM-DD' format.
   * @returns An array of payment history records.
   */
 async getCustomerPaymentHistory(
  customerNumber: string,
  startDate: string,
  endDate: string
): Promise<PaymentHistoryRecord[]> {
  try {
    // Validate date inputs
    if (!startDate || !endDate) {
      throw new Error('startDate and endDate are required parameters.');
    }

    // Fetch payment history using the method in DynamicsPaymentService
    const paymentHistory = await this.dynamicsPaymentService.getCustomerPaymentsWithInvoices(
      customerNumber,
      startDate,
      endDate
    );

    return paymentHistory;
  } catch (error) {
    const err = error as any;
    this.logger.error(`Error fetching payment history for customer ${customerNumber}: ${err.message}`);
    throw new HttpException('Failed to fetch payment history', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}


  /**
   * Retrieves receivables for a specific date from the balance sheet report.
   * @param date - The date in 'YYYY-MM-DD' format.
   * @returns The receivable amount.
   */
  private async getReceivablesForDate(date: string): Promise<number> {
    this.logger.debug(`Fetching receivables for date: ${date}`);

    try {
      const balanceSheet = await this.dynamicsReportsService.getBalanceSheetStatements(date);
      const receivableLine = balanceSheet.value.find((item) =>
        item.display.toLowerCase().includes('total accounts receivable'),
      );

      if (receivableLine) {
        const receivableAmount = receivableLine.balance ?? 0;
        return receivableAmount;
      } else {
        this.logger.warn(`Total Accounts Receivable not found in balance sheet for ${date}`);
        return 0;
      }
    } catch (error) {
    const err = error as any;
      this.logger.error(`Error fetching receivables for date ${date}: ${err.message}`);
      throw error;
    }
  }

  /**
   * Retrieves invoice details and associated invoice lines.
   * @param invoiceNumber - The invoice number.
   * @returns An object containing the invoice and its lines.
   */
  async getInvoiceDetails(invoiceNumber: string): Promise<{ invoice: Invoice; invoiceLines: InvoiceLine[] }> {
    try {
      const invoice = await this.dynamicsInvoiceService.getInvoiceByNumber(invoiceNumber);
      if (!invoice) {
        throw new Error(`Invoice with number ${invoiceNumber} not found`);
      }

      const invoiceLines = await this.dynamicsInvoiceService.getInvoiceLinesByInvoiceId(invoice.id);
      return { invoice, invoiceLines };
    } catch (error) {
    const err = error as any;
      this.logger.error(`Error fetching invoice details: ${err.message}`);
      throw error;
    }
  }

  async getBalanceSheetTotalAR(date: string): Promise<number> {
    // Implement fetching AR from the balance sheet
    const balanceSheet = await this.dynamicsReportsService.getBalanceSheetStatements(date);
    const receivableLine = balanceSheet.value.find(item =>
      item.display.toLowerCase().includes('total accounts receivable'),
    );

    return receivableLine ? receivableLine.balance : 0;
  }

  async getTotalNewInvoices(startDate: string, endDate: string): Promise<number> {
    // Implement logic to fetch total invoices between the date range
    const invoices = await this.dynamicsInvoiceService.getInvoices(startDate, endDate);
    return invoices.reduce((sum, invoice) => sum + invoice.totalAmountIncludingTax, 0);
  }

  async getRevenueByCategory(startDate: string, endDate: string): Promise<{ totalRevenue: number; revenueByCategory: Record<string, number> }> {
    const revenue = await this.dynamicsInvoiceService.getRevenueByCategory(startDate, endDate);
    return revenue;  // Ensure you're returning the correct object
}

  async getInvoicesByNumbers(invoiceNumbers: string[]): Promise<any[]> {
    // Implement logic to fetch invoices by their numbers
    return await this.dynamicsInvoiceService.getInvoicesByNumbers(invoiceNumbers);
  }

  /**
 * Retrieves the total credits (credit memos) during the specified date range.
 * @param startDate - The start date in 'YYYY-MM-DD' format.
 * @param endDate - The end date in 'YYYY-MM-DD' format.
 * @returns The total credits amount.
 */
async getTotalCredits(startDate: string, endDate: string): Promise<number> {
  this.logger.debug(`Fetching total credits from ${startDate} to ${endDate}`);

  try {
    const creditEntries = await this.dynamicsCreditService.getCreditMemos(startDate, endDate);
    const totalCredits = creditEntries.reduce((sum, entry) => sum + (entry.debitAmount || 0), 0);
    this.logger.debug(`Total credits calculated: ${totalCredits}`);
    return totalCredits;
  } catch (error) {
    const err = error as any;
    this.logger.error(`Error fetching total credits: ${err.message}`);
    throw new HttpException('Failed to fetch total credits', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

}

