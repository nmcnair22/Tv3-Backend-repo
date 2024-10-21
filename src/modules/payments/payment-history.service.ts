import { Injectable, Logger } from '@nestjs/common';
import { DynamicsPaymentService } from '../dynamics/dynamics-payment.service';

@Injectable()
export class PaymentHistoryService {
  private readonly logger = new Logger(PaymentHistoryService.name);

  constructor(
    private readonly dynamicsPaymentService: DynamicsPaymentService,
  ) {}

  /**
   * Fetches payment history for a customer within a date range.
   * @param customerNumber - The customer number.
   * @param startDate - Start date in 'YYYY-MM-DD' format.
   * @param endDate - End date in 'YYYY-MM-DD' format.
   * @returns Payment history data, including payments and their associated invoices.
   */
  async getCustomerPaymentHistory(
    customerNumber: string,
    startDate: string,
    endDate: string
  ) {
    this.logger.debug(
      `Fetching payment history for customer: ${customerNumber} between ${startDate} and ${endDate}`
    );

    try {
      // Fetch payments from Customer Ledger Entries for the given customer and date range
      const payments = await this.dynamicsPaymentService.getCustomerPaymentsFromLedger(startDate, endDate);

      // Map the payments to associated invoices
      const paymentHistory = await Promise.all(
        payments.map(async (payment) => {
          const relatedInvoices = await this.dynamicsPaymentService.getInvoicesByClosedEntryNo(payment.entryNo);
          return {
            paymentDate: payment.postingDate,
            paymentAmount: payment.amount,
            relatedInvoices,
          };
        }),
      );

      return paymentHistory;
    } catch (error) {
      this.logger.error(`Error fetching payment history for ${customerNumber}:`, error.message);
      throw new Error('Failed to fetch payment history.');
    }
  }
}
