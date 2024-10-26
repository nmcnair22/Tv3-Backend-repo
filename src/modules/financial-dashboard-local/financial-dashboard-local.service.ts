// src/modules/financial-dashboard-local/financial-dashboard-local.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, MoreThan, Repository } from 'typeorm';
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
  ) {}

  // Adjusted method signature to accept Date objects
  async getReceivablesForDate(asOfDate: Date): Promise<number> {
    const result = await this.customerLedgerEntryRepository
      .createQueryBuilder('entry')
      .select('SUM(entry.remainingAmount)', 'total')
      .where('entry.postingDate <= :date', { date: asOfDate })
      .getRawOne();

    return parseFloat(result.total) || 0;
  }

  // Adjusted method signature to accept Date objects
  async getTotalCredits(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.salesCreditMemoRepository
      .createQueryBuilder('creditMemo')
      .select('SUM(creditMemo.total_amount_including_tax)', 'total')
      .where('creditMemo.posting_date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();

    return parseFloat(result.total) || 0;
  }

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

  async getIncomeAccounts(): Promise<Account[]> {
    const accounts = await this.accountRepository.find({
      where: {
        category: 'Income',
      },
    });

    return accounts;
  }

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

  calculateTotalNewInvoices(postedInvoices: SalesInvoice[]): number {
    return postedInvoices.reduce((sum, invoice) => {
      const amount = parseFloat(invoice.totalAmountIncludingTax as any) || 0;
      return sum + amount;
    }, 0);
  }

  async getPayments(startDate: Date, endDate: Date): Promise<CustomerLedgerEntry[]> {
    const payments = await this.customerLedgerEntryRepository.find({
        where: {
            documentType: 'Payment',
            postingDate: Between(startDate, endDate),
        },
    });

    return payments;
  }

  getTotalPaymentsReceived(payments: CustomerLedgerEntry[]): number {
    return payments.reduce((sum, payment) => {
      const creditAmount = parseFloat(payment.creditAmount as any) || 0;
      return sum + creditAmount;
    }, 0);
  }

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
  }> {
    this.logger.debug(`Fetching inflows data from ${startDate} to ${endDate}`);

    // Convert startDate and endDate strings to Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Step 1: Fetch starting and ending receivables
    const [startingReceivables, endingReceivables] = await Promise.all([
      this.getReceivablesForDate(start),
      this.getReceivablesForDate(end),
    ]);

    const netChangeReceivables = endingReceivables - startingReceivables;

    // Step 2: Fetch posted sales invoices within the date range
    const postedInvoices = await this.getPostedInvoices(startDate, endDate);
    this.logger.debug(`Total posted invoices: ${postedInvoices.length}`);

    // Step 3: Fetch income accounts
    const incomeAccounts = await this.getIncomeAccounts();
    this.logger.debug(`Total income accounts: ${incomeAccounts.length}`);

    // Step 4: Fetch and categorize revenue by account number from invoices and GL entries
    const revenueCategoriesMap = await this.getRevenueCategories(postedInvoices, incomeAccounts);
    this.logger.debug(`Total revenue categories identified: ${revenueCategoriesMap.size}`);

    // Step 5: Calculate totalNewInvoices from invoices
    const totalNewInvoices = this.calculateTotalNewInvoices(postedInvoices);
    this.logger.debug(`Total new invoices amount: ${totalNewInvoices}`);

    // Step 6: Fetch payments from the ledger (Customer Ledger Entries)
    const paymentsFromLedger = await this.getPayments(start, end);

    // Step 7: Calculate total payments received
    const totalPaymentsReceived = this.getTotalPaymentsReceived(paymentsFromLedger);
    this.logger.debug(`Total payments received: ${totalPaymentsReceived}`);

    // Step 8: Group payments by customer and include payment details
    const paymentsByCustomerMap = this.groupPaymentsByCustomer(paymentsFromLedger);

    // Step 9: Fetch total credits during the period
    const totalCredits = await this.getTotalCredits(start, end);
    this.logger.debug(`Total credits amount: ${totalCredits}`);

    // Step 10: Convert Map to Array for paymentsByCustomer
    const paymentsByCustomer = Array.from(paymentsByCustomerMap.entries()).map(
      ([customer, data]) => ({
        customer,
        amount: data.amount,
        payments: data.payments,
      }),
    );

    // Step 11: Prepare revenueCategories array
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
      totalNewInvoices,
      totalCredits,
      totalPaymentsReceived,
      revenueCategories: revenueCategoriesArray,
      paymentsByCustomer,
    };
  }
}