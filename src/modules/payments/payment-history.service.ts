// src/modules/payments/payment-history.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentCustomerLedger } from '../../common/types/payment.types'; // Import added
import { DynamicsPaymentService } from '../dynamics/dynamics-payment.service';
import { Customer } from '../sync/entities/customer.entity';
import { PaymentHistory } from '../sync/entities/payment-history.entity';
import { SalesInvoice } from '../sync/entities/sales-invoice.entity';
import { CreatePaymentHistoryDto } from './dto/create-payment-history.dto';

@Injectable()
export class PaymentHistoryService {
  private readonly logger = new Logger(PaymentHistoryService.name);

  constructor(
    private readonly dynamicsPaymentService: DynamicsPaymentService,
    @InjectRepository(PaymentHistory)
    private readonly paymentHistoryRepository: Repository<PaymentHistory>,
    @InjectRepository(SalesInvoice)
    private readonly salesInvoiceRepository: Repository<SalesInvoice>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  /**
   * Fetches payment history for a customer within a date range and persists it.
   * @param customerNumber - The customer number.
   * @param startDate - Start date in 'YYYY-MM-DD' format.
   * @param endDate - End date in 'YYYY-MM-DD' format.
   * @returns Payment history data, including payments and their associated invoices.
   */
  async getCustomerPaymentHistory(
    customerNumber: string,
    startDate: string,
    endDate: string,
): Promise<PaymentHistory[]> {
    this.logger.debug(
        `Fetching payment history for customer: ${customerNumber} between ${startDate} and ${endDate}`
    );

    try {
        // Fetch payments from Customer Ledger Entries for the given customer and date range
        const payments: PaymentCustomerLedger[] = await this.dynamicsPaymentService.getCustomerPaymentsFromLedger(startDate, endDate);

        // Map the payments to associated invoices and persist them
        const paymentHistoryPromises = payments.map(async (payment: PaymentCustomerLedger) => { // Explicitly type 'payment' as PaymentCustomerLedger
            const relatedInvoices = await this.dynamicsPaymentService.getInvoicesByClosedEntryNo(payment.entryNo);

            // Iterate over each related invoice to create PaymentHistory records
            const paymentRecordsPromises = relatedInvoices.map(async (invoice) => {
                const salesInvoice = await this.salesInvoiceRepository.findOne({
                    where: { number: invoice.documentNo },
                });

                if (!salesInvoice) {
                    this.logger.warn(`SalesInvoice not found for invoice number: ${invoice.documentNo}`);
                    return null;
                }

                // Calculate days early or late
                let daysEarly: number | undefined = undefined;
                let daysLate: number | undefined = undefined;

                const paymentDate = new Date(payment.postingDate); // Convert to Date if necessary
                const dueDate = salesInvoice.dueDate;

                const delayInMs = paymentDate.getTime() - dueDate.getTime();
                const delayInDays = Math.floor(delayInMs / (1000 * 60 * 60 * 24));

                let status: string;
                if (delayInDays < 0) {
                    status = 'On-Time';
                    daysEarly = Math.abs(delayInDays);
                } else if (delayInDays === 0) {
                    status = 'On-Time';
                } else {
                    status = 'Late';
                    daysLate = delayInDays;
                }

                // Determine if it's a partial payment
                const amountPaid = Math.abs(payment.amount || 0);
                const remainingBalance = Math.abs(payment.debitAmount || 0); // Assuming 'debitAmount' represents remaining balance

                if (remainingBalance > 0) {
                    status = 'Partial';
                }

                // Create DTO for PaymentHistory
                const createPaymentHistoryDto: CreatePaymentHistoryDto = {
                    paymentId: payment.entryNo.toString(),
                    depositEntryNo: payment.depositEntryNo || '',
                    paymentAmount: amountPaid,
                    paymentType: payment.paymentType || '',
                    relatedInvoiceId: salesInvoice.id, // Updated property
                    customerNumber: customerNumber,
                    paymentDate: paymentDate, // Assuming DTO accepts Date
                    status,
                    daysEarly,
                    daysLate,
                };

                // Check if the payment already exists to prevent duplicates
                const existingPayment = await this.paymentHistoryRepository.findOne({
                    where: { paymentId: payment.entryNo.toString(), relatedInvoiceId: salesInvoice.id },
                });

                if (existingPayment) {
                    this.logger.debug(`PaymentHistory already exists for payment ID: ${payment.entryNo} and invoice: ${salesInvoice.number}`);
                    return null;
                }

                // Save the payment history
                const paymentHistory = this.paymentHistoryRepository.create(createPaymentHistoryDto);
                await this.paymentHistoryRepository.save(paymentHistory);
                this.logger.debug(`Saved PaymentHistory for payment ID: ${payment.entryNo} and invoice: ${salesInvoice.number}`);

                return paymentHistory;
            });

            // Await all related invoice payments
            const paymentRecords = await Promise.all(paymentRecordsPromises);
            return paymentRecords.filter(record => record !== null) as PaymentHistory[];
        });

        // Await all payments and flatten the results
        const paymentHistoryNested = await Promise.all(paymentHistoryPromises);
        const flattenedPaymentHistory = paymentHistoryNested.flat();

        return flattenedPaymentHistory;
    } catch (error) {
        const err = error as any;
        this.logger.error(`Error fetching payment history for ${customerNumber}:`, err.message);
        throw new Error('Failed to fetch payment history.');
    }
}
}
