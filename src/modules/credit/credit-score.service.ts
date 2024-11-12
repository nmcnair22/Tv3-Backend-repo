// src/modules/credit/credit-score.service.ts

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { addMonths, format, subDays, subMonths, subWeeks } from 'date-fns';
import {
    Between,
    In,
    LessThanOrEqual,
    MoreThan,
    Repository,
} from 'typeorm';
import { CreditScoreHistory } from '../sync/entities/credit-score-history.entity';
import { CustomerLedgerEntry } from '../sync/entities/customer-ledger-entry.entity';
import { Customer } from '../sync/entities/customer.entity';
import { GeneralLedgerEntry } from '../sync/entities/general-ledger-entry.entity';
import { SalesInvoiceLine } from '../sync/entities/sales-invoice-line.entity';
import { SalesInvoice } from '../sync/entities/sales-invoice.entity';
import { PaymentDataDto, UnpaidInvoiceDto } from './dto/payment-history.dto';

// Enum to represent spend tiers
enum SpendTier {
  Bronze = 'Bronze',
  Silver = 'Silver',
  Gold = 'Gold',
  Platinum = 'Platinum',
}

// Interface for tier parameters
interface TierParameters {
  maxPurchaseAmount: number;
  maxOutstandingBalance: number;
  weights: {
    w1: number; // Weight for Purchase Amount Factor (PAF)
    w2: number; // Weight for Payment Timeliness Factor (PTF)
    w3: number; // Weight for Outstanding Balance Factor (OBF)
  };
}

@Injectable()
export class CreditScoreService {
  private readonly logger = new Logger(CreditScoreService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,

    @InjectRepository(CreditScoreHistory)
    private readonly creditScoreHistoryRepository: Repository<CreditScoreHistory>,

    @InjectRepository(SalesInvoice)
    private readonly salesInvoiceRepository: Repository<SalesInvoice>,

    @InjectRepository(SalesInvoiceLine)
    private readonly salesInvoiceLineRepository: Repository<SalesInvoiceLine>,

    @InjectRepository(CustomerLedgerEntry)
    private readonly customerLedgerEntryRepository: Repository<CustomerLedgerEntry>,

    @InjectRepository(GeneralLedgerEntry)
    private readonly generalLedgerEntryRepository: Repository<GeneralLedgerEntry>,
  ) {}

  // Spend tier settings based on provided criteria
  private tierSettings: { [key in SpendTier]: TierParameters } = {
    [SpendTier.Bronze]: {
      maxPurchaseAmount: 5000,
      maxOutstandingBalance: 1000,
      weights: {
        w1: 0.25,
        w2: 0.40,
        w3: 0.35,
      },
    },
    [SpendTier.Silver]: {
      maxPurchaseAmount: 15000,
      maxOutstandingBalance: 5000,
      weights: {
        w1: 0.30,
        w2: 0.40,
        w3: 0.30,
      },
    },
    [SpendTier.Gold]: {
      maxPurchaseAmount: 40000,
      maxOutstandingBalance: 10000,
      weights: {
        w1: 0.35,
        w2: 0.40,
        w3: 0.25,
      },
    },
    [SpendTier.Platinum]: {
      maxPurchaseAmount: 60000,
      maxOutstandingBalance: 20000,
      weights: {
        w1: 0.40,
        w2: 0.40,
        w3: 0.20,
      },
    },
  };

  /**
   * Determines the customer's spend tier based on average monthly spend.
   */
  private determineSpendTier(averageMonthlySpend: number): SpendTier {
    if (averageMonthlySpend <= 5000) {
      return SpendTier.Bronze;
    } else if (averageMonthlySpend <= 15000) {
      return SpendTier.Silver;
    } else if (averageMonthlySpend <= 40000) {
      return SpendTier.Gold;
    } else {
      return SpendTier.Platinum;
    }
  }

  /**
   * Calculates and updates credit scores for all customers.
   */
  async calculateAndUpdateCreditScores(): Promise<void> {
    this.logger.debug('Starting credit score calculation for all customers.');

    const customers = await this.customerRepository.find();
    this.logger.debug(`Fetched ${customers.length} customers.`);

    for (const customer of customers) {
      try {
        this.logger.debug(`Calculating credit score for customer ${customer.customerNumber}`);
        await this.calculateAndUpdateCreditScoreForCustomer(customer.customerNumber);
      } catch (error) {
        this.logger.error(
          `Error calculating/updating credit score for customer ${customer.customerNumber}`,
          error.stack,
        );
      }
    }

    this.logger.debug('Completed credit score calculation for all customers.');
  }

    /**
   * Retrieves the spend trend data for a customer over a specified date range.
   * @param customerNumber - The customer number.
   * @param startDate - The start date in 'YYYY-MM-DD' format.
   * @param endDate - The end date in 'YYYY-MM-DD' format.
   * @returns An object mapping months to spend amounts.
   */
    async getSpendTrendData(customerNumber: string, startDate: string, endDate: string): Promise<any> {
        this.logger.debug(`Fetching spend trend data for customer ${customerNumber}`);
        const invoices = await this.salesInvoiceRepository.find({
          where: {
            customerNumber,
            invoiceDate: Between(new Date(startDate), new Date(endDate)),
          },
        });
      
        const spendTrend = {};
      
        invoices.forEach((invoice) => {
          const month = format(invoice.invoiceDate, 'yyyy-MM');
          const amount = Number(invoice.totalAmountIncludingTax) || 0; // Ensure amount is a number
          if (!spendTrend[month]) {
            spendTrend[month] = 0;
          }
          spendTrend[month] += amount; // Numeric addition
        });
      
        return spendTrend;
      }

      /**
       * Retrieves the spend by product category for a customer over a specified date range.
       * @param customerNumber - The customer number.
       * @param startDate - The start date in 'YYYY-MM-DD' format.
       * @param endDate - The end date in 'YYYY-MM-DD' format.
       * @returns An array of categories with total spend amounts.
       */
      async getSpendByCategory(customerNumber: string, startDate: string, endDate: string): Promise<any> {
        this.logger.debug(`Fetching spend by category for customer ${customerNumber}`);
        const invoiceLines = await this.salesInvoiceLineRepository
          .createQueryBuilder('line')
          .innerJoin('line.salesInvoice', 'invoice')
          .where('invoice.customerNumber = :customerNumber', { customerNumber })
          .andWhere('invoice.invoiceDate BETWEEN :startDate AND :endDate', { startDate, endDate })
          .select('line.lineObjectNumber', 'category')
          .addSelect('SUM(line.amountIncludingTax)', 'totalAmount')
          .groupBy('line.lineObjectNumber')
          .getRawMany();
    
        return invoiceLines.map((line) => ({
          category: line.category,
          totalAmount: parseFloat(line.totalAmount),
        }));
      }
    
  /**
   * Calculates and updates credit score for a specific customer.
   * @param customerNumber Unique customer number
   * @param asOfDate Optional date to calculate the credit score as of
   */
  async calculateAndUpdateCreditScoreForCustomer(
    customerNumber: string,
    asOfDate?: Date,
  ): Promise<void> {
    this.logger.debug(`Fetching data for customer ${customerNumber}`);
    const customer = await this.getCustomerCreditScore(customerNumber);
    if (!customer) {
      throw new NotFoundException(`Customer with number ${customerNumber} not found.`);
    }

    // Calculate credit score
    this.logger.debug('Calculating credit score for customer');
    const creditScoreData = await this.calculateCreditScore(customerNumber, asOfDate);
    this.logger.debug(`Calculated credit score data: ${JSON.stringify(creditScoreData)}`);

    // Update customer fields
    this.logger.debug(`Updating customer ${customer.customerNumber} with new credit score data`);
    customer.creditScore = creditScoreData.creditScore;
    customer.creditTier = creditScoreData.creditTier;
    customer.averageMonthlySpend = creditScoreData.averageMonthlySpend;
    customer.totalSpend = creditScoreData.factors.totalPurchaseAmount;
    customer.outstandingBalance = creditScoreData.factors.outstandingBalance;
    // Any other fields you wish to update

    // Save updated customer
    await this.customerRepository.save(customer);
    this.logger.debug(`Updated credit score for customer ${customer.customerNumber}`);

    // Create a new CreditScoreHistory record
    this.logger.debug(`Creating credit score history record for customer ${customer.customerNumber}`);
    const creditScoreHistory = this.creditScoreHistoryRepository.create({
      customerNumber: customer.customerNumber,
      creditScore: creditScoreData.creditScore,
      creditTier: creditScoreData.creditTier,
      spendTier: creditScoreData.spendTier,
      recordedAt: new Date(),
      totalPurchaseAmount: creditScoreData.factors.totalPurchaseAmount,
      averageMonthlySpend: creditScoreData.averageMonthlySpend,
      PAF: creditScoreData.factors.PAF,
      totalTimelinessPoints: creditScoreData.factors.totalTimelinessPoints,
      PTF: creditScoreData.factors.PTF,
      outstandingBalance: creditScoreData.factors.outstandingBalance,
      OBF: creditScoreData.factors.OBF,
    });

    await this.creditScoreHistoryRepository.save(creditScoreHistory);
    this.logger.debug(`Saved credit score history for customer ${customer.customerNumber}`);
  }

  /**
   * Calculates the credit score for a customer as of a specific date.
   * @param customerNumber - The customer number.
   * @param asOfDate - Optional date up to which to consider data.
   * @returns The credit score and contributing factors.
   */
  async calculateCreditScore(customerNumber: string, asOfDate?: Date): Promise<any> {
    const loggerContext = 'calculateCreditScore';
    this.logger.debug(`Calculating credit score for customer ${customerNumber}`, loggerContext);

    // Use the provided asOfDate or default to the current date
    const effectiveDate = asOfDate ? new Date(asOfDate) : new Date();
    this.logger.debug(`Effective date for calculation: ${effectiveDate.toISOString()}`, loggerContext);

    // Define the calculation period (e.g., the last 12 months)
    const monthsInPeriod = 12;
    const invoiceStartDate = subMonths(effectiveDate, monthsInPeriod - 1);
    const startOfMonth = new Date(invoiceStartDate.getFullYear(), invoiceStartDate.getMonth(), 1);
    const endOfMonth = new Date(effectiveDate.getFullYear(), effectiveDate.getMonth(), 1);

    // Fetch monthly spend data
    const monthlySpendData = await this.salesInvoiceRepository
      .createQueryBuilder('invoice')
      .select("DATE_FORMAT(invoice.postingDate, '%Y-%m')", 'month')
      .addSelect('SUM(invoice.totalAmountIncludingTax)', 'monthlySpend')
      .where('invoice.customerNumber = :customerNumber', { customerNumber })
      .andWhere('invoice.postingDate BETWEEN :startDate AND :endDate', {
        startDate: startOfMonth,
        endDate: effectiveDate,
      })
      .groupBy('month')
      .orderBy('month')
      .getRawMany();

    this.logger.debug(`Monthly spend data: ${JSON.stringify(monthlySpendData)}`, loggerContext);

    // Create a map of months to spend amounts
    const spendByMonthMap = new Map<string, number>();
    for (const record of monthlySpendData) {
      spendByMonthMap.set(record.month, parseFloat(record.monthlySpend));
    }

    // Generate list of months in the period
    const monthsList = [];
    let currentMonth = new Date(startOfMonth);
    while (currentMonth <= endOfMonth) {
      const monthKey = format(currentMonth, 'yyyy-MM');
      monthsList.push(monthKey);
      currentMonth = addMonths(currentMonth, 1);
    }

    // Calculate total spend and include months with zero spend
    let totalSpend = 0;
    for (const month of monthsList) {
      const monthSpend = spendByMonthMap.get(month) || 0;
      totalSpend += monthSpend;
    }

    // Calculate average monthly spend
    const averageMonthlySpend = totalSpend / monthsInPeriod;
    this.logger.debug(`Calculated average monthly spend: ${averageMonthlySpend}`, loggerContext);

    // Determine spend tier based on calculated averageMonthlySpend
    const spendTier = this.determineSpendTier(averageMonthlySpend);
    const tierParams = this.tierSettings[spendTier];
    this.logger.debug(`Customer spend tier: ${spendTier}`, loggerContext);

    // Fetch payment history using local database
    const paymentHistory = await this.getCustomerPaymentHistory(
      customerNumber,
      undefined,
      effectiveDate.toISOString().split('T')[0],
    );
    const { payments, unpaidInvoices, partiallyPaidInvoices } = paymentHistory;
    this.logger.debug(`Payment history fetched: ${payments.length} payments`, loggerContext);

    // Initialize variables
    let totalPurchaseAmount = 0;
    let totalTimelinessPoints = 0;
    let maxTimelinessPoints = 0;
    let outstandingBalance = 0;

    // Constants for timeliness points
    const k1 = 2; // Points per day early
    const k2 = 10; // Points for on-time payment
    const k3 = -1; // Points per day late (negative value)

    // **Calculate Total Purchase Amount**
    payments.forEach((payment) => {
      payment.relatedInvoices.forEach((invoice) => {
        const amount = Number(invoice.amount) || 0;
        totalPurchaseAmount += amount;
      });
    });
    this.logger.debug(`Total purchase amount: ${totalPurchaseAmount}`, loggerContext);

    // **Calculate Payment Timeliness Points**
    payments.forEach((payment) => {
      payment.relatedInvoices.forEach((invoice) => {
        const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : undefined;
        const paymentDate = payment.paymentDate ? new Date(payment.paymentDate) : undefined;

        if (!dueDate || !paymentDate) {
          return; // Skip if dates are invalid
        }

        // Only consider invoices and payments up to the effective date
        if (paymentDate > effectiveDate) return;

        const timeDiff = paymentDate.getTime() - dueDate.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (!isNaN(daysDiff)) {
          if (daysDiff < 0) {
            // Early Payment
            const daysEarly = Math.abs(daysDiff);
            totalTimelinessPoints += daysEarly * k1;
            this.logger.debug(`Early payment: ${daysEarly} days early, points: ${daysEarly * k1}`, loggerContext);
          } else if (daysDiff === 0) {
            // On-Time Payment
            totalTimelinessPoints += k2;
            this.logger.debug(`On-time payment, points: ${k2}`, loggerContext);
          } else {
            // Late Payment
            totalTimelinessPoints += daysDiff * k3; // daysDiff is positive
            this.logger.debug(`Late payment: ${daysDiff} days late, points: ${daysDiff * k3}`, loggerContext);
          }
          // Assume maximum possible points is early by 30 days per invoice
          maxTimelinessPoints += 30 * k1;
        }
      });
    });
    this.logger.debug(`Total timeliness points: ${totalTimelinessPoints}`, loggerContext);
    this.logger.debug(`Max timeliness points: ${maxTimelinessPoints}`, loggerContext);

    // **Calculate Outstanding Balance**
    outstandingBalance = unpaidInvoices.reduce((sum, invoice) => {
      if (invoice.invoiceDate && new Date(invoice.invoiceDate) <= effectiveDate) {
        return sum + Number(invoice.totalAmount) || 0;
      }
      return sum;
    }, 0);

    outstandingBalance += partiallyPaidInvoices.reduce((sum, invoice) => {
      if (invoice.invoiceDate && new Date(invoice.invoiceDate) <= effectiveDate) {
        return sum + Number(invoice.amountRemaining) || 0;
      }
      return sum;
    }, 0);
    this.logger.debug(`Outstanding balance: ${outstandingBalance}`, loggerContext);

    // **Normalize Factors**
    const PAF = Math.min((totalPurchaseAmount / tierParams.maxPurchaseAmount) * 100, 100);
    const PTF =
      maxTimelinessPoints > 0
        ? Math.min(Math.max((totalTimelinessPoints / maxTimelinessPoints) * 100, 0), 100)
        : 0;
    const OBF = Math.max(100 - (outstandingBalance / tierParams.maxOutstandingBalance) * 100, 0);

    this.logger.debug(`Normalized factors: PAF=${PAF}, PTF=${PTF}, OBF=${OBF}`, loggerContext);

    // **Calculate Credit Score**
    const baseScore = 600;
    const { w1, w2, w3 } = tierParams.weights;

    let creditScore = baseScore + w1 * PAF + w2 * PTF + w3 * OBF;

    // Ensure the credit score is within 300-850
    creditScore = Math.max(300, Math.min(creditScore, 850));

    this.logger.debug(`Calculated credit score: ${creditScore}`, loggerContext);

    // **Determine Credit Tier**
    let creditTier = 'Poor';
    if (creditScore >= 800) {
      creditTier = 'Excellent';
    } else if (creditScore >= 700) {
      creditTier = 'Good';
    } else if (creditScore >= 600) {
      creditTier = 'Fair';
    }

    // **Return the Credit Score and Factors**
    return {
      customerNumber,
      creditScore: Math.round(creditScore),
      creditTier,
      spendTier,
      averageMonthlySpend,
      factors: {
        totalPurchaseAmount,
        PAF: Math.round(PAF),
        totalTimelinessPoints,
        PTF: Math.round(PTF),
        outstandingBalance,
        OBF: Math.round(OBF),
      },
    };
  }
  /**
   * Retrieves the payment history for a specific customer.
   * @param customerNumber - The customer number.
   * @param startDate - Optional start date in 'YYYY-MM-DD' format.
   * @param endDate - Optional end date in 'YYYY-MM-DD' format.
   * @returns An object containing payments, unpaidInvoices, and partiallyPaidInvoices.
   */
  async getCustomerPaymentHistory(
    customerNumber: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    payments: PaymentDataDto[];
    unpaidInvoices: UnpaidInvoiceDto[];
    partiallyPaidInvoices: UnpaidInvoiceDto[];
  }> {
    const loggerContext = 'getCustomerPaymentHistory';

    if (!customerNumber) {
      this.logger.error('Customer number is required', loggerContext);
      throw new Error('customerNumber parameter is required');
    }

    // Parse dates
    const start = startDate ? new Date(startDate) : new Date('1900-01-01');
    const end = endDate ? new Date(endDate) : new Date();

    // Adjust end date to include the entire day
    end.setHours(23, 59, 59, 999);

    this.logger.debug(
      `Fetching payment history for customer ${customerNumber} from ${start.toISOString()} to ${end.toISOString()}`,
      loggerContext,
    );

    // **1. Fetch Payments**
    this.logger.debug(`Fetching payment entries for customer ${customerNumber}`, loggerContext);
    const paymentEntries = await this.customerLedgerEntryRepository.find({
      where: {
        documentType: 'Payment',
        postingDate: Between(start, end),
        customerNo: customerNumber,
      },
      order: { postingDate: 'DESC' },
    });
    this.logger.debug(`Fetched ${paymentEntries.length} payment entries`, loggerContext);

    // Map payments to their related invoices
    const paymentsWithInvoices = await this.mapPaymentsToInvoices(paymentEntries, end);

    // **2. Fetch Open Invoices**
    this.logger.debug(`Fetching open invoices for customer ${customerNumber}`, loggerContext);
    const openInvoices = await this.salesInvoiceRepository.find({
      where: {
        customerNumber,
        status: 'Open',
        invoiceDate: LessThanOrEqual(end),
      },
    });
    this.logger.debug(`Fetched ${openInvoices.length} open invoices`, loggerContext);

    // **3. Determine Payment Status of Open Invoices**
    const { unpaidInvoices, partiallyPaidInvoices } = await this.determineInvoicePaymentStatus(
      openInvoices,
      customerNumber,
      end,
    );
    this.logger.debug(
      `Identified ${unpaidInvoices.length} unpaid invoices and ${partiallyPaidInvoices.length} partially paid invoices`,
      loggerContext,
    );

    // **4. Return Combined Data**
    return {
      payments: paymentsWithInvoices,
      unpaidInvoices,
      partiallyPaidInvoices,
    };
  }

  // Helper method to map payments to invoices
  private async mapPaymentsToInvoices(
    paymentEntries: CustomerLedgerEntry[],
    asOfDate: Date,
  ): Promise<PaymentDataDto[]> {
    const loggerContext = 'mapPaymentsToInvoices';
    this.logger.debug(`Mapping payments to invoices`, loggerContext);

    const paymentEntryNos = paymentEntries.map((entry) => entry.entryNo);

    // Fetch all invoices that were closed by these payments
    const invoicesApplied = await this.customerLedgerEntryRepository.find({
      where: {
        closedByEntryNo: In(paymentEntryNos),
        documentType: 'Invoice',
        postingDate: LessThanOrEqual(asOfDate),
      },
    });
    this.logger.debug(`Fetched ${invoicesApplied.length} invoices applied`, loggerContext);

    // Build a map of payment entries for easy access
    const paymentEntryMap = new Map<number, CustomerLedgerEntry>();
    for (const paymentEntry of paymentEntries) {
      paymentEntryMap.set(paymentEntry.entryNo, paymentEntry);
    }

    // Collect all invoice numbers to fetch their due dates
    const invoiceNumbers = invoicesApplied.map((invoiceEntry) => invoiceEntry.documentNo);

    // Fetch SalesInvoice records to get the due dates
    const salesInvoices = await this.salesInvoiceRepository.find({
      where: {
        number: In(invoiceNumbers),
      },
      select: ['number', 'dueDate'],
    });
    this.logger.debug(`Fetched ${salesInvoices.length} sales invoices for due dates`, loggerContext);

    // Create a map of invoice number to due date
    const invoiceDueDateMap = new Map<string, Date>();
    for (const invoice of salesInvoices) {
      invoiceDueDateMap.set(invoice.number, invoice.dueDate);
    }

    const paymentsWithInvoicesMap = new Map<number, PaymentDataDto>();

    for (const invoiceEntry of invoicesApplied) {
      const paymentEntry = paymentEntryMap.get(invoiceEntry.closedByEntryNo);
      if (paymentEntry) {
        if (!paymentsWithInvoicesMap.has(paymentEntry.entryNo)) {
          paymentsWithInvoicesMap.set(paymentEntry.entryNo, {
            paymentDate: paymentEntry.postingDate,
            paymentAmount: Math.abs(paymentEntry.amount),
            description: paymentEntry.description,
            paymentEntryNo: paymentEntry.entryNo, // number
            relatedInvoices: [],
          });
        }

        // Include the due date in invoiceData
        const invoiceData = {
          invoiceNumber: invoiceEntry.documentNo,
          invoiceDate: invoiceEntry.documentDate,
          amount: invoiceEntry.debitAmount,
          dueDate: invoiceDueDateMap.get(invoiceEntry.documentNo) || undefined,
        };

        const paymentData = paymentsWithInvoicesMap.get(paymentEntry.entryNo);
        paymentData.relatedInvoices.push(invoiceData);
      }
    }

    this.logger.debug(`Mapped payments to invoices`, loggerContext);

    return Array.from(paymentsWithInvoicesMap.values());
  }

  // Helper method to determine payment status of invoices
  private async determineInvoicePaymentStatus(
    openInvoices: SalesInvoice[],
    customerNumber: string,
    asOfDate: Date,
  ): Promise<{ unpaidInvoices: UnpaidInvoiceDto[]; partiallyPaidInvoices: UnpaidInvoiceDto[] }> {
    const loggerContext = 'determineInvoicePaymentStatus';
    this.logger.debug(`Determining payment status of open invoices`, loggerContext);

    // Collect all invoice numbers
    const invoiceNumbers = openInvoices.map((invoice) => invoice.number);

    // Fetch ledger entries for these invoices up to 'asOfDate'
    const ledgerEntries = await this.customerLedgerEntryRepository.find({
      where: {
        documentNo: In(invoiceNumbers),
        customerNo: customerNumber,
        documentType: 'Invoice',
        postingDate: LessThanOrEqual(asOfDate),
      },
    });
    this.logger.debug(`Fetched ${ledgerEntries.length} ledger entries for open invoices`, loggerContext);

    // Map ledger entries by invoice number
    const ledgerEntriesByInvoice = new Map<string, CustomerLedgerEntry[]>();
    for (const entry of ledgerEntries) {
      if (!ledgerEntriesByInvoice.has(entry.documentNo)) {
        ledgerEntriesByInvoice.set(entry.documentNo, []);
      }
      ledgerEntriesByInvoice.get(entry.documentNo).push(entry);
    }

    const unpaidInvoices: UnpaidInvoiceDto[] = [];
    const partiallyPaidInvoices: UnpaidInvoiceDto[] = [];

    for (const invoice of openInvoices) {
      const entries = ledgerEntriesByInvoice.get(invoice.number) || [];

      let totalAmount = 0;
      let amountRemaining = 0;

      for (const entry of entries) {
        totalAmount += parseFloat(entry.debitAmount.toString()) || 0;
        amountRemaining += parseFloat(entry.remainingAmount.toString()) || 0;
      }

      const amountPaid = totalAmount - amountRemaining;

      if (amountPaid > 0 && amountRemaining > 0) {
        // Partially paid
        partiallyPaidInvoices.push({
          invoiceNumber: invoice.number,
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          totalAmount,
          amountPaid,
          amountRemaining,
          status: 'Partially Paid',
        });
      } else if (amountPaid === 0 && amountRemaining > 0) {
        // Unpaid
        unpaidInvoices.push({
          invoiceNumber: invoice.number,
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          totalAmount,
          amountPaid: 0,
          amountRemaining,
          status: 'Unpaid',
        });
      }
    }

    this.logger.debug(
      `Payment status determined: ${unpaidInvoices.length} unpaid, ${partiallyPaidInvoices.length} partially paid`,
      loggerContext,
    );

    return { unpaidInvoices, partiallyPaidInvoices };
  }

  /**
   * Retrieves the current credit score for a customer
   * @param customerNumber Unique customer number
   */
  async getCustomerCreditScore(customerNumber: string): Promise<Customer> {
    this.logger.debug(`Fetching customer with number ${customerNumber}`);
    const customer = await this.customerRepository.findOne({
      where: { customerNumber },
    });
    if (!customer) {
      this.logger.warn(`Customer with number ${customerNumber} not found.`);
      throw new NotFoundException(`Customer with number ${customerNumber} not found.`);
    }
    this.logger.debug(`Found customer: ${JSON.stringify(customer)}`);
    return customer;
  }

  /**
   * Retrieves the credit score history for a customer over a specified date range.
   * @param customerNumber - The customer number.
   * @param startDate - The start date in 'YYYY-MM-DD' format.
   * @param endDate - The end date in 'YYYY-MM-DD' format.
   * @param interval - The interval for the history ('monthly', 'weekly', 'daily').
   * @returns An array of credit scores with corresponding dates.
   */
  async getCreditScoreHistory(
    customerNumber: string,
    startDate: string,
    endDate: string,
    interval: 'monthly' | 'weekly' | 'daily' = 'monthly',
  ): Promise<any[]> {
    const loggerContext = 'getCreditScoreHistory';
    this.logger.debug(`Fetching credit score history for customer ${customerNumber}`, loggerContext);

    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates: Date[] = [];
    let currentDate = end;

    // Generate dates at the specified interval
    while (currentDate >= start) {
      dates.push(new Date(currentDate));
      if (interval === 'monthly') {
        currentDate = subMonths(currentDate, 1);
      } else if (interval === 'weekly') {
        currentDate = subWeeks(currentDate, 1);
      } else if (interval === 'daily') {
        currentDate = subDays(currentDate, 1);
      }
    }

    this.logger.debug(`Generated ${dates.length} dates for history`, loggerContext);

    const creditScores = [];
    for (const date of dates.reverse()) {
      this.logger.debug(`Calculating credit score for date ${format(date, 'yyyy-MM-dd')}`, loggerContext);
      const scoreData = await this.calculateCreditScore(customerNumber, date);
      creditScores.push({
        date: format(date, 'yyyy-MM-dd'),
        creditScore: scoreData.creditScore,
      });
    }

    return creditScores;
  }

/**
   * Retrieves recent contributing factors that have affected the customer's credit score.
   * @param customerNumber - The customer number.
   * @param limit - The maximum number of factors to return.
   * @returns An array of messages explaining the contributing factors.
   */
async getContributingFactors(customerNumber: string, limit: number = 5): Promise<string[]> {
    const loggerContext = 'getContributingFactors';
    this.logger.debug(`Fetching contributing factors for customer ${customerNumber}`, loggerContext);

    const factors: string[] = [];

    // Define the period to look back for events (e.g., last 3 months)
    const lookBackPeriod = subMonths(new Date(), 3);

    // **1. Fetch Recent Payments**
    const recentPayments = await this.customerLedgerEntryRepository.find({
      where: {
        customerNo: customerNumber,
        documentType: 'Payment',
        postingDate: MoreThan(lookBackPeriod),
      },
      order: { postingDate: 'DESC' },
    });

    // **2. Fetch Related Invoices for Payments**
    for (const paymentEntry of recentPayments) {
      const paymentEntryNo = paymentEntry.entryNo;

      // Convert paymentDate to Date object
      const paymentDate = paymentEntry.postingDate ? new Date(paymentEntry.postingDate) : null;
      if (!paymentDate || isNaN(paymentDate.getTime())) {
        this.logger.warn(`Payment entry ${paymentEntry.entryNo} has invalid postingDate`, loggerContext);
        continue; // Skip this payment entry
      }

      // Find invoices that were closed by this payment
      const invoicesApplied = await this.customerLedgerEntryRepository.find({
        where: {
          closedByEntryNo: paymentEntryNo,
          documentType: 'Invoice',
        },
      });

      for (const invoiceEntry of invoicesApplied) {
        const invoiceNumber = invoiceEntry.documentNo;
        const invoice = await this.salesInvoiceRepository.findOne({
          where: { number: invoiceNumber },
        });

        if (invoice) {
          const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
          if (!dueDate || isNaN(dueDate.getTime())) {
            this.logger.warn(`Invoice ${invoice.number} has invalid dueDate`, loggerContext);
            continue; // Skip this invoice
          }

          const daysDifference = Math.ceil(
            (paymentDate.getTime() - dueDate.getTime()) / (1000 * 3600 * 24),
          );

          let message = '';

          if (daysDifference > 0) {
            // Paid Late
            message = `Invoice ${invoice.number} was due on ${format(
              dueDate,
              'MM/dd/yyyy',
            )} and was paid ${daysDifference} day(s) late on ${format(
              paymentDate,
              'MM/dd/yyyy',
            )}.`;
          } else if (daysDifference < 0) {
            // Paid Early
            message = `Invoice ${invoice.number} was paid ${Math.abs(
              daysDifference,
            )} day(s) early on ${format(paymentDate, 'MM/dd/yyyy')}. Thank you for early payment!`;
          } else {
            // Paid On Time
            message = `Invoice ${invoice.number} was paid on time on ${format(
              paymentDate,
              'MM/dd/yyyy',
            )}.`;
          }

          factors.push(message);
        }

        if (factors.length >= limit) {
          return factors;
        }
      }
    }

    // **3. Fetch Unpaid and Partially Paid Invoices**
    const { unpaidInvoices, partiallyPaidInvoices } = await this.getUnpaidAndPartiallyPaidInvoices(
      customerNumber,
      new Date(),
    );

    // Process partially paid invoices
    for (const invoice of partiallyPaidInvoices) {
      const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
      const invoiceDate = invoice.invoiceDate ? new Date(invoice.invoiceDate) : null;
      if (!dueDate || !invoiceDate || isNaN(dueDate.getTime()) || isNaN(invoiceDate.getTime())) continue;

      const daysPastDue = Math.max(
        0,
        Math.ceil(
          (new Date().getTime() - dueDate.getTime()) / (1000 * 3600 * 24),
        ),
      );

      const message = `Partial payment of $${invoice.amountPaid.toFixed(
        2,
      )} made for invoice ${invoice.invoiceNumber} on ${format(
        invoiceDate,
        'MM/dd/yyyy',
      )}. Remaining balance is $${invoice.amountRemaining.toFixed(
        2,
      )}. Invoice is ${daysPastDue} day(s) past due.`;

      factors.push(message);

      if (factors.length >= limit) {
        return factors;
      }
    }

    // Process unpaid invoices
    for (const invoice of unpaidInvoices) {
      const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
      if (!dueDate || isNaN(dueDate.getTime())) continue;

      const daysPastDue = Math.max(
        0,
        Math.ceil(
          (new Date().getTime() - dueDate.getTime()) / (1000 * 3600 * 24),
        ),
      );

      if (daysPastDue > 0) {
        const message = `Invoice ${invoice.invoiceNumber} for $${invoice.totalAmount.toFixed(
          2,
        )} is ${daysPastDue} day(s) past due since ${format(
          dueDate,
          'MM/dd/yyyy',
        )}. Please make payment to avoid impacting your credit score.`;

        factors.push(message);

        if (factors.length >= limit) {
          return factors;
        }
      }
    }

    // If no factors found, return a default message
    if (factors.length === 0) {
      factors.push('No recent events have affected your credit score.');
    }

    return factors.slice(0, limit);
  }
 /**
   * Helper method to determine payment status of invoices.
   * Fetches unpaid and partially paid invoices for a customer as of a specific date.
   * @param customerNumber - The customer number.
   * @param effectiveDate - The date up to which to consider invoices.
   * @returns An object containing arrays of unpaid and partially paid invoices.
   */
 private async getUnpaidAndPartiallyPaidInvoices(
    customerNumber: string,
    effectiveDate: Date,
  ): Promise<{ unpaidInvoices: UnpaidInvoiceDto[]; partiallyPaidInvoices: UnpaidInvoiceDto[] }> {
    const loggerContext = 'getUnpaidAndPartiallyPaidInvoices';
    this.logger.debug(`Fetching unpaid and partially paid invoices for customer ${customerNumber}`, loggerContext);

    // **1. Fetch Open Invoices Up to Effective Date**
    const openInvoices = await this.salesInvoiceRepository.find({
      where: {
        customerNumber,
        status: 'Open',
        invoiceDate: LessThanOrEqual(effectiveDate),
      },
    });
    this.logger.debug(`Fetched ${openInvoices.length} open invoices`, loggerContext);

    // **2. Collect Invoice Numbers**
    const invoiceNumbers = openInvoices.map((invoice) => invoice.number);

    // **3. Fetch Ledger Entries for These Invoices**
    const ledgerEntries = await this.customerLedgerEntryRepository.find({
      where: {
        documentNo: In(invoiceNumbers),
        customerNo: customerNumber,
        documentType: 'Invoice',
        postingDate: LessThanOrEqual(effectiveDate),
      },
    });
    this.logger.debug(`Fetched ${ledgerEntries.length} ledger entries for open invoices`, loggerContext);

    // **4. Organize Ledger Entries by Invoice Number**
    const ledgerEntriesByInvoice = new Map<string, CustomerLedgerEntry[]>();
    for (const entry of ledgerEntries) {
      if (!ledgerEntriesByInvoice.has(entry.documentNo)) {
        ledgerEntriesByInvoice.set(entry.documentNo, []);
      }
      ledgerEntriesByInvoice.get(entry.documentNo).push(entry);
    }

    const unpaidInvoices: UnpaidInvoiceDto[] = [];
    const partiallyPaidInvoices: UnpaidInvoiceDto[] = [];

    // **5. Determine Payment Status for Each Invoice**
    for (const invoice of openInvoices) {
      const entries = ledgerEntriesByInvoice.get(invoice.number) || [];

      let totalAmount = 0;
      let amountRemaining = 0;

      for (const entry of entries) {
        totalAmount += parseFloat(entry.debitAmount.toString()) || 0;
        amountRemaining += parseFloat(entry.remainingAmount.toString()) || 0;
      }

      const amountPaid = totalAmount - amountRemaining;

      if (amountPaid > 0 && amountRemaining > 0) {
        // **Partially Paid Invoice**
        partiallyPaidInvoices.push({
          invoiceNumber: invoice.number,
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          totalAmount,
          amountPaid,
          amountRemaining,
          status: 'Partially Paid',
        });
      } else if (amountPaid === 0 && amountRemaining > 0) {
        // **Unpaid Invoice**
        unpaidInvoices.push({
          invoiceNumber: invoice.number,
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          totalAmount,
          amountPaid: 0,
          amountRemaining,
          status: 'Unpaid',
        });
      }
      // If the amountRemaining === 0, the invoice is fully paid and we can ignore it.
    }

    this.logger.debug(
      `Identified ${unpaidInvoices.length} unpaid invoices and ${partiallyPaidInvoices.length} partially paid invoices`,
      loggerContext,
    );

    return { unpaidInvoices, partiallyPaidInvoices };
  }

  /**
   * Scheduled Cron Job to Calculate Credit Scores for All Customers
   * Runs daily at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleCreditScoreCron() {
    this.logger.debug('Starting scheduled credit score calculation...');
    try {
      await this.calculateAndUpdateCreditScores();
      this.logger.debug('Credit score calculation completed successfully.');
    } catch (error) {
      this.logger.error('Credit score calculation failed', error.stack);
    }
  }
}