// src/modules/financial-dashboard-local/financial-dashboard-local.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, MoreThan, Repository } from 'typeorm';
import { DynamicsReportsService } from '../dynamics/dynamics-reports.service';
import { Account } from '../sync/entities/account.entity';
import { CustomerLedgerEntry } from '../sync/entities/customer-ledger-entry.entity';
import { GeneralLedgerEntry } from '../sync/entities/general-ledger-entry.entity';
import { SalesCreditMemo } from '../sync/entities/sales-credit-memo.entity';
import { SalesInvoice } from '../sync/entities/sales-invoice.entity';

@Injectable()
export class FinancialDashboardLocalService {
  private readonly logger = new Logger(FinancialDashboardLocalService.name);

  constructor(
    @InjectRepository(CustomerLedgerEntry)
    private readonly customerLedgerEntryRepository: Repository<CustomerLedgerEntry>,
    @InjectRepository(SalesInvoice)
    private readonly salesInvoiceRepository: Repository<SalesInvoice>,
    @InjectRepository(GeneralLedgerEntry)
    private readonly generalLedgerEntryRepository: Repository<GeneralLedgerEntry>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(SalesCreditMemo)
    private readonly salesCreditMemoRepository: Repository<SalesCreditMemo>,
    private readonly dynamicsReportsService: DynamicsReportsService, // Injected DynamicsReportsService
  ) {}

  /**
   * Subtracts one day from a given date string in 'YYYY-MM-DD' format using UTC methods.
   * @param dateStr - The original date string.
   * @returns The adjusted date string.
   */
  private subtractOneDay(dateStr: string): string {
    // Ensure the date string is in 'YYYY-MM-DD' format and append 'T00:00:00Z' for UTC
    const date = new Date(`${dateStr}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - 1); // Subtract one day using UTC

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are zero-indexed
    const day = String(date.getUTCDate()).padStart(2, '0');

    const adjustedDate = `${year}-${month}-${day}`;
    this.logger.debug(`subtractOneDay: Original Date: ${dateStr}, Adjusted Date: ${adjustedDate}`);
    return adjustedDate;
  }

  /**
   * Retrieves receivables for a specific date from the balance sheet report.
   * @param date - The date in 'YYYY-MM-DD' format.
   * @returns The receivable amount.
   */
  async getReceivablesForDate(date: string): Promise<number> {
    this.logger.debug(`Fetching receivables for date: ${date}`);

    try {
      const balanceSheet = await this.dynamicsReportsService.getBalanceSheetStatements(date);
      const receivableLine = balanceSheet.value.find((item) =>
        item.display.toLowerCase().includes('total accounts receivable'),
      );

      if (receivableLine) {
        const receivableAmount = receivableLine.balance ?? 0;
        this.logger.debug(`Receivables on ${date}: ${receivableAmount}`);
        return receivableAmount;
      } else {
        this.logger.warn(`Total Accounts Receivable not found in balance sheet for ${date}`);
        return 0;
      }
    } catch (error) {
      const err = error as any;
      this.logger.error(`Error fetching receivables for date ${date}: ${err.message}`);
      throw new Error('Failed to fetch receivables from Dynamics API');
    }
  }

  /**
   * Executes the SQL query to fetch New Revenue, Payments, Credits, Adjustments, and Total Change in AR.
   * @param startDate - The start date in 'YYYY-MM-DD' format.
   * @param endDate - The end date in 'YYYY-MM-DD' format.
   * @returns An object containing the calculated financial metrics.
   */
  async getARChangeData(startDate: string, endDate: string): Promise<{
    newRevenue: number;
    payments: number;
    credits: number;
    adjustments: number;
    totalChangeInAR: number;
  }> {
    this.logger.debug(`Executing AR Change SQL Query from ${startDate} to ${endDate}`);

    // Using TypeORM's Query Builder to execute the aggregated SQL query
    const query = this.generalLedgerEntryRepository
      .createQueryBuilder('g')
      .select([
        `IFNULL(SUM(CASE WHEN g.document_type = 'Invoice' THEN g.debit_amount END), 0) AS \`New Revenue\``,
        `IFNULL(SUM(CASE WHEN g.document_type = 'Payment' THEN g.credit_amount END), 0) AS \`Payments\``,
        `IFNULL(SUM(CASE WHEN g.document_type = 'Credit_x0020_Memo' THEN g.credit_amount END), 0) AS \`Credits\``,
        `IFNULL(SUM(CASE WHEN g.document_type = '_x0020_' THEN g.debit_amount END), 0) -
         IFNULL(SUM(CASE WHEN g.document_type = '_x0020_' THEN g.credit_amount END), 0) AS \`Adjustments\``,
        `IFNULL(SUM(g.debit_amount), 0) - IFNULL(SUM(g.credit_amount), 0) AS \`Total Change in AR\``,
      ])
      .where('g.posting_date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('g.account_number = :accountNumber', { accountNumber: '13100' });

    try {
      const result = await query.getRawOne();

      if (!result) {
        this.logger.warn('No AR Change data found for the specified period.');
        return {
          newRevenue: 0,
          payments: 0,
          credits: 0,
          adjustments: 0,
          totalChangeInAR: 0,
        };
      }

      // Parse the results to ensure they are numbers
      return {
        newRevenue: parseFloat(result['New Revenue']) || 0,
        payments: parseFloat(result['Payments']) || 0,
        credits: parseFloat(result['Credits']) || 0,
        adjustments: parseFloat(result['Adjustments']) || 0,
        totalChangeInAR: parseFloat(result['Total Change in AR']) || 0,
      };
    } catch (error) {
      this.logger.error('Error executing AR Change SQL Query:', error);
      throw new Error('Failed to retrieve AR Change data.');
    }
  }

  /**
   * Fetches posted sales invoices within the date range.
   * @param startDate - The start date in 'YYYY-MM-DD' format.
   * @param endDate - The end date in 'YYYY-MM-DD' format.
   * @returns An array of SalesInvoice entities.
   */
  async getPostedInvoices(startDate: string, endDate: string): Promise<SalesInvoice[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const invoices = await this.salesInvoiceRepository.find({
      where: {
        invoiceDate: Between(start, end),
        status: In(['Open', 'Paid']),
      },
    });
    return invoices;
  }

  /**
   * Fetches income accounts.
   * @returns An array of Account entities categorized as 'Income'.
   */
  async getIncomeAccounts(): Promise<Account[]> {
    const accounts = await this.accountRepository.find({
      where: {
        category: 'Income',
      },
    });

    return accounts;
  }

  /**
   * Categorizes revenue by account number from invoices and GL entries.
   * @param postedInvoices - An array of posted SalesInvoice entities.
   * @param incomeAccounts - An array of Account entities categorized as 'Income'.
   * @returns A map of category names to total amounts.
   */
  async getRevenueCategories(
    postedInvoices: SalesInvoice[],
    incomeAccounts: Account[],
  ): Promise<Map<string, number>> {
    // Create a map from account numbers to categories
    const accountNumberToCategory = new Map<string, string>();
    incomeAccounts.forEach((account) => {
      accountNumberToCategory.set(
        account.number,
        account.subCategory || account.displayName || 'Uncategorized Income',
      );
    });

    // Fetch all relevant GL entries in one query
    const invoiceNumbers = postedInvoices.map((invoice) => invoice.number);
    const glEntries = await this.generalLedgerEntryRepository.find({
      where: {
        documentNumber: In(invoiceNumbers),
        creditAmount: MoreThan(0),
      },
    });

    // Categorize revenue
    const revenueCategories = new Map<string, number>();
    glEntries.forEach((glEntry) => {
      const accountNumber = glEntry.accountNumber;
      const categoryName = accountNumberToCategory.get(accountNumber) || 'Uncategorized Income';

      const currentAmount = revenueCategories.get(categoryName) || 0;
      const creditAmount = parseFloat(glEntry.creditAmount as any) || 0;

      revenueCategories.set(categoryName, currentAmount + creditAmount);
    });

    return revenueCategories;
  }

  /**
   * Calculates the total new invoices amount from posted invoices.
   * @param postedInvoices - An array of posted SalesInvoice entities.
   * @returns The total amount of new invoices.
   */
  calculateTotalNewInvoices(postedInvoices: SalesInvoice[]): number {
    return postedInvoices.reduce((sum, invoice) => {
      const amount = parseFloat(invoice.totalAmountIncludingTax as any) || 0;
      return sum + amount;
    }, 0);
  }

  /**
   * Fetches payments from the ledger (Customer Ledger Entries) within the date range.
   * @param startDate - The start date as a Date object.
   * @param endDate - The end date as a Date object.
   * @returns An array of CustomerLedgerEntry entities.
   */
  async getPayments(startDate: Date, endDate: Date): Promise<CustomerLedgerEntry[]> {
    const payments = await this.customerLedgerEntryRepository.find({
      where: {
        documentType: 'Payment',
        postingDate: Between(startDate, endDate),
      },
    });

    return payments;
  }

  /**
   * Calculates the total payments received from customer ledger entries.
   * @param payments - An array of CustomerLedgerEntry entities.
   * @returns The total amount of payments received.
   */
  getTotalPaymentsReceived(payments: CustomerLedgerEntry[]): number {
    return payments.reduce((sum, payment) => {
      const creditAmount = parseFloat(payment.creditAmount as any) || 0;
      return sum + creditAmount;
    }, 0);
  }

  /**
   * Groups payments by customer and includes payment details.
   * @param payments - An array of CustomerLedgerEntry entities.
   * @returns A map of customer names to their total payment amounts and payment details.
   */
  groupPaymentsByCustomer(payments: CustomerLedgerEntry[]): Map<string, { amount: number; payments: any[] }> {
    const paymentsByCustomerMap = new Map<string, { amount: number; payments: any[] }>();

    payments.forEach((payment) => {
      const customerName = payment.customerName || 'Unknown';
      const amount = parseFloat(payment.creditAmount as any) || 0;

      if (!paymentsByCustomerMap.has(customerName)) {
        paymentsByCustomerMap.set(customerName, { amount: 0, payments: [] });
      }

      const customerData = paymentsByCustomerMap.get(customerName);
      customerData.amount += amount;

      // Format posting date
      let formattedPostingDate: string | null = null;
      if (payment.postingDate) {
        let postingDate: Date;
        if (payment.postingDate instanceof Date) {
          postingDate = payment.postingDate;
        } else {
          postingDate = new Date(payment.postingDate);
        }

        if (!isNaN(postingDate.getTime())) {
          formattedPostingDate = postingDate.toISOString().split('T')[0];
        } else {
          this.logger.warn(`Invalid postingDate for payment ${payment.documentNo}: ${payment.postingDate}`);
        }
      } else {
        this.logger.warn(`Missing postingDate for payment ${payment.documentNo}`);
      }

      customerData.payments.push({
        amount: amount,
        postingDate: formattedPostingDate,
        documentNo: payment.documentNo,
        description: payment.description,
        // Include other fields as needed
      });
    });

    return paymentsByCustomerMap;
  }

  /**
   * Retrieves AR Change data (New Revenue, Payments, Credits, Adjustments, Total Change in AR)
   * and integrates it into the inflows data.
   * @param startDate - The start date in 'YYYY-MM-DD' format.
   * @param endDate - The end date in 'YYYY-MM-DD' format.
   * @returns An object containing all inflows data.
   */
  async getInflowsData(
    startDate: string,
    endDate: string,
  ): Promise<{
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
      }[];
    }[];
    adjustments: number; // New field
    totalChangeInAR: number; // New field
  }> {
    this.logger.debug(`Fetching inflows data from ${startDate} to ${endDate}`);

    // Adjust the startDate to be one day before
    const adjustedStartDate = this.subtractOneDay(startDate);
    this.logger.debug(`Adjusted Start Date: ${adjustedStartDate}`);

    // Convert startDate and endDate strings to Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);

    try {
      // Step 1: Fetch starting and ending receivables using live API calls
      const [startingReceivables, endingReceivables] = await Promise.all([
        this.getReceivablesForDate(adjustedStartDate), // Use adjustedStartDate
        this.getReceivablesForDate(endDate),
      ]);

      const netChangeReceivables = endingReceivables - startingReceivables;

      // Step 2: Fetch AR Change data from MySQL
      const arChangeData = await this.getARChangeData(startDate, endDate);
      this.logger.debug(`AR Change Data: ${JSON.stringify(arChangeData)}`);

      const {
        newRevenue,
        payments,
        credits,
        adjustments,
        totalChangeInAR,
      } = arChangeData;

      // Step 3: Fetch posted sales invoices within the date range
      const postedInvoices = await this.getPostedInvoices(startDate, endDate);
      this.logger.debug(`Total posted invoices: ${postedInvoices.length}`);

      // Step 4: Fetch income accounts
      const incomeAccounts = await this.getIncomeAccounts();
      this.logger.debug(`Total income accounts: ${incomeAccounts.length}`);

      // Step 5: Fetch and categorize revenue by account number from invoices and GL entries
      const revenueCategoriesMap = await this.getRevenueCategories(postedInvoices, incomeAccounts);
      this.logger.debug(`Total revenue categories identified: ${revenueCategoriesMap.size}`);

      // Step 6: Fetch payments from the ledger (Customer Ledger Entries)
      const paymentsFromLedger = await this.getPayments(start, end);

      // Step 7: Group payments by customer and include payment details
      const paymentsByCustomerMap = this.groupPaymentsByCustomer(paymentsFromLedger);

      // Step 8: Convert Map to Array for paymentsByCustomer
      const paymentsByCustomer = Array.from(paymentsByCustomerMap.entries()).map(
        ([customer, data]) => ({
          customer,
          amount: data.amount,
          payments: data.payments,
        }),
      );

      // Step 9: Prepare revenueCategories array
      const revenueCategoriesArray = Array.from(revenueCategoriesMap.entries()).map(
        ([category, amount]) => ({
          category,
          amount,
        }),
      );

      // Return the full inflows data
      return {
        startingReceivables,
        endingReceivables,
        netChangeReceivables,
        totalNewInvoices: newRevenue, // Updated to New Revenue
        totalCredits: credits, // Updated to Credits
        totalPaymentsReceived: payments, // Updated to Payments
        revenueCategories: revenueCategoriesArray, // Adjust as needed or retain existing logic
        paymentsByCustomer,
        adjustments, // New field
        totalChangeInAR, // New field
      };
    } catch (error) {
      this.logger.error('Error fetching inflows data:', error);
      throw new Error('Failed to fetch inflows data.');
    }
  }
  async getRecentActivities() {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 120 * 60 * 60 * 1000);
  
    const activities = [];
  
    // Fetch invoices posted in the last 48 hours with statuses 'Open' or 'Paid'
    const newInvoices = await this.salesInvoiceRepository.find({
      where: {
        postingDate: Between(twoDaysAgo, now),
        status: In(['Open', 'Paid']),
      },
    });
  
    for (const invoice of newInvoices) {
      const statusLabel = invoice.status === 'Paid' ? 'Paid' : 'Unpaid';
  
      const activity = {
        id: invoice.id,
        type: 'Invoice',
        createdAt: invoice.postingDate, // Use postingDate as activity date
        customerName: invoice.customerName,
        customerNo: invoice.customerNumber,
        documentNumber: invoice.number,
        amount: invoice.totalAmountIncludingTax,
        dueDate: invoice.dueDate,
        postingDate: invoice.postingDate,
        status: invoice.status,
        statusLabel: statusLabel, // Add this field
      };
      activities.push(activity);
    }
  
    // Fetch payments posted in the last 48 hours
    const paymentEntries = await this.customerLedgerEntryRepository.find({
      where: {
        documentType: 'Payment',
        postingDate: Between(twoDaysAgo, now),
      },
      order: { postingDate: 'DESC' },
    });
  
    // Collect their entryNo
    const paymentEntryNos = paymentEntries.map(entry => entry.entryNo);
  
    // Fetch invoices where closedByEntryNo is in paymentEntryNos
    const invoicesApplied = await this.customerLedgerEntryRepository.find({
      where: {
        closedByEntryNo: In(paymentEntryNos),
      },
    });
  
    // Map paymentEntryNo to paymentEntry
    const paymentEntryMap = new Map<number, any>();
    for (const paymentEntry of paymentEntries) {
      paymentEntryMap.set(paymentEntry.entryNo, paymentEntry);
    }
  
    // Create activities for each invoice applied
    for (const invoiceEntry of invoicesApplied) {
      const paymentEntry = paymentEntryMap.get(invoiceEntry.closedByEntryNo);
      if (paymentEntry) {
        const isLate = invoiceEntry.dueDate
          ? new Date(invoiceEntry.dueDate) < new Date(paymentEntry.postingDate)
          : false;
        const statusLabel = isLate ? 'Late' : 'On Time';
  
        const activity = {
          id: `payment-${paymentEntry.entryNo}-${invoiceEntry.entryNo}`,
          type: 'Payment',
          createdAt: paymentEntry.postingDate, // Use postingDate of the payment
          customerName: invoiceEntry.customerName,
          customerNo: invoiceEntry.customerNo,
          documentNumber: invoiceEntry.documentNo,
          amount: Math.abs(invoiceEntry.amount), // Ensure amount is positive
          postingDate: paymentEntry.postingDate,
          dueDate: invoiceEntry.dueDate,
          description: invoiceEntry.description,
          isLate: isLate,
          statusLabel: statusLabel, // Add this field
        };
        activities.push(activity);
      }
    }
  
    // Fetch new credit memos posted in the last 48 hours
    const newCredits = await this.salesCreditMemoRepository.find({
      where: {
        postingDate: Between(twoDaysAgo, now),
      },
    });
  
    for (const creditMemo of newCredits) {
      const activity = {
        id: creditMemo.id,
        type: 'Credit Memo',
        createdAt: creditMemo.postingDate,
        customerName: creditMemo.customerName,
        customerNo: creditMemo.customerNumber,
        documentNumber: creditMemo.number,
        amount: creditMemo.totalAmountIncludingTax,
        postingDate: creditMemo.postingDate,
        status: creditMemo.status,
        // Optionally add statusLabel if needed for credit memos
      };
      activities.push(activity);
    }
  
    // Fetch adjustments posted in the last 48 hours
    const adjustmentEntries = await this.generalLedgerEntryRepository.find({
      where: {
        documentType: '_x0020_',
        accountNumber: '13100',
        postingDate: Between(twoDaysAgo, now),
      },
    });
  
    for (const adjustment of adjustmentEntries) {
      const debitAmount = adjustment.debitAmount ?? 0;
      const creditAmount = adjustment.creditAmount ?? 0;
      const activity = {
        id: adjustment.id,
        type: 'Adjustment',
        createdAt: adjustment.postingDate,
        description: adjustment.description,
        amount: debitAmount - creditAmount,
        postingDate: adjustment.postingDate,
        // Optionally add statusLabel if needed for adjustments
      };
      activities.push(activity);
    }
  
    // Sort activities by creation date descending
    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
    // Limit the number of activities returned
    return activities;
  }

   /**
   * Fetches counts and details of new activities in the last 48 hours.
   */
   async getNewActivities() {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Fetch new invoices
    const newInvoices = await this.salesInvoiceRepository.find({
      where: {
        createdAt: Between(twoDaysAgo, now),
      },
    });

    // Fetch new payments
    const newPayments = await this.generalLedgerEntryRepository.find({
      where: {
        createdAt: Between(twoDaysAgo, now),
        documentType: 'Payment',
        accountNumber: '13100',
      },
    });

    // Fetch new credits
    const newCredits = await this.generalLedgerEntryRepository.find({
      where: {
        createdAt: Between(twoDaysAgo, now),
        documentType: 'Credit_x0020_Memo',
        accountNumber: '13100',
      },
    });

    // Fetch new adjustments
    const newAdjustments = await this.generalLedgerEntryRepository.find({
      where: {
        createdAt: Between(twoDaysAgo, now),
        documentType: '_x0020_',
        accountNumber: '13100',
      },
    });

    return {
      newInvoices: {
        count: newInvoices.length,
        items: newInvoices,
      },
      newPayments: {
        count: newPayments.length,
        items: newPayments,
      },
      newCredits: {
        count: newCredits.length,
        items: newCredits,
      },
      newAdjustments: {
        count: newAdjustments.length,
        items: newAdjustments,
      },
    };
  }

  /**
   * Retrieves the payment history for a specific customer.
   * @param customerNumber - The customer number.
   * @param startDate - Optional start date in 'YYYY-MM-DD' format.
   * @param endDate - Optional end date in 'YYYY-MM-DD' format.
   * @returns An array of payment history records.
   */
  async getCustomerPaymentHistory(
    customerNumber: string,
    startDate?: string,
    endDate?: string,
  ): Promise<any[]> {
    const loggerContext = 'getCustomerPaymentHistory';

    if (!customerNumber) {
      this.logger.error('Customer number is required', loggerContext);
      throw new Error('customerNumber parameter is required');
    }

    const start = startDate ? new Date(startDate) : new Date('1900-01-01');
    const end = endDate ? new Date(endDate) : new Date();

    this.logger.debug(
      `Fetching payment history for customer ${customerNumber} from ${start.toISOString()} to ${end.toISOString()}`,
      loggerContext,
    );

    // Fetch payments for the customer in the given date range
    const paymentEntries = await this.customerLedgerEntryRepository.find({
      where: {
        documentType: 'Payment',
        postingDate: Between(start, end),
        customerNo: customerNumber,
      },
      order: { postingDate: 'DESC' },
    });

    if (paymentEntries.length === 0) {
      this.logger.debug(`No payments found for customer ${customerNumber}`, loggerContext);
      return [];
    }

    // Collect entry numbers
    const paymentEntryNos = paymentEntries.map((entry) => entry.entryNo);

    // Fetch invoices where closedByEntryNo is in paymentEntryNos
    const invoicesApplied = await this.customerLedgerEntryRepository.find({
      where: {
        closedByEntryNo: In(paymentEntryNos),
        customerNo: customerNumber,
        documentType: 'Invoice',
      },
    });

    // Map paymentEntryNo to paymentEntry
    const paymentEntryMap = new Map<number, any>();
    for (const paymentEntry of paymentEntries) {
      paymentEntryMap.set(paymentEntry.entryNo, paymentEntry);
    }

    // Map payment entries to their associated invoices
    const paymentsWithInvoicesMap = new Map<number, any>();

    for (const invoiceEntry of invoicesApplied) {
      const paymentEntry = paymentEntryMap.get(invoiceEntry.closedByEntryNo);
      if (paymentEntry) {
        if (!paymentsWithInvoicesMap.has(paymentEntry.entryNo)) {
          paymentsWithInvoicesMap.set(paymentEntry.entryNo, {
            paymentDate: paymentEntry.postingDate,
            paymentAmount: Math.abs(paymentEntry.amount),
            description: paymentEntry.description,
            paymentEntryNo: paymentEntry.entryNo,
            relatedInvoices: [],
          });
        }

        const invoiceData = {
          invoiceNumber: invoiceEntry.documentNo,
          invoiceDate: invoiceEntry.documentDate,
          amount: invoiceEntry.debitAmount,
        };

        const paymentData = paymentsWithInvoicesMap.get(paymentEntry.entryNo);
        paymentData.relatedInvoices.push(invoiceData);
      }
    }

    // Convert the Map to an array
    const paymentsWithInvoices = Array.from(paymentsWithInvoicesMap.values());

    // Sort payments by paymentDate descending
    paymentsWithInvoices.sort(
      (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime(),
    );

    return paymentsWithInvoices;
  }


  // Remove or comment out the following methods if they are no longer needed

  /**
   * Placeholder for getting receivables for a specific date.
   * Replace with actual implementation.
   */
  // private async getReceivablesForDate(date: string): Promise<number> {
  //   // Implement your logic to fetch receivables for the given date
  //   // This might involve calling an external API or querying the database
  //   return 0; // Placeholder
  // }

  /**
   * Placeholder for getting posted invoices.
   * Replace with actual implementation if needed.
   */
  // private async getPostedInvoices(startDate: string, endDate: string): Promise<SalesInvoice[]> {
  //   // Implement your logic to fetch posted invoices
  //   return []; // Placeholder
  // }

  /**
   * Placeholder for getting income accounts.
   * Replace with actual implementation if needed.
   */
  // private async getIncomeAccounts(): Promise<Account[]> {
  //   // Implement your logic to fetch income accounts
  //   return []; // Placeholder
  // }

  /**
   * Placeholder for getting revenue categories.
   * Replace with actual implementation if needed.
   */
  // private async getRevenueCategories(postedInvoices: SalesInvoice[], incomeAccounts: Account[]): Promise<Map<string, number>> {
  //   // Implement your logic to categorize revenue
  //   return new Map(); // Placeholder
  // }

  /**
   * Placeholder for calculating total new invoices.
   * Replace with actual implementation if needed.
   */
  // private calculateTotalNewInvoices(postedInvoices: SalesInvoice[]): number {
  //   // Implement your logic to calculate total new invoices
  //   return 0; // Placeholder
  // }

  /**
   * Placeholder for getting payments.
   * Replace with actual implementation if needed.
   */
  // private async getPayments(start: Date, end: Date): Promise<CustomerLedgerEntry[]> {
  //   // Implement your logic to fetch payments from the ledger
  //   return []; // Placeholder
  // }

  /**
   * Placeholder for calculating total payments received.
   * Replace with actual implementation if needed.
   */
  // private getTotalPaymentsReceived(paymentsFromLedger: CustomerLedgerEntry[]): number {
  //   // Implement your logic to calculate total payments received
  //   return 0; // Placeholder
  // }

  /**
   * Placeholder for grouping payments by customer.
   * Replace with actual implementation if needed.
   */
  // private groupPaymentsByCustomer(payments: CustomerLedgerEntry[]): Map<string, { amount: number; payments: any[] }> {
  //   // Implement your logic to group payments by customer
  //   return new Map(); // Placeholder
  // }

  /**
   * Placeholder for getting total credits.
   * Since we're now fetching credits via SQL, you might want to remove this method.
   */
  // private async getTotalCredits(start: Date, end: Date): Promise<number> {
  //   // Implement your logic to calculate total credits
  //   return 0; // Placeholder
  // }
}
