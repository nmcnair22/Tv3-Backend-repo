// src/modules/dynamics/dynamics-payment.service.ts

import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import {
  Invoice,
  PaymentCustomerLedger,
  PaymentGL,
} from '../../common/types/payment.types';
import { DynamicsBaseService } from './dynamics-base.service';

@Injectable()
export class DynamicsPaymentService extends DynamicsBaseService {
  protected readonly logger = new Logger(DynamicsPaymentService.name);

  /**
   * Fetches customer payments from CustLedgerEntries within a date range.
   * @param startDate - Start date in 'YYYY-MM-DD' format.
   * @param endDate - End date in 'YYYY-MM-DD' format.
   * @returns Array of PaymentCustomerLedger objects.
   */
  async getCustomerPaymentsFromLedger(
    startDate: string,
    endDate: string,
  ): Promise<PaymentCustomerLedger[]> {
    this.logger.debug('Fetching customer payments from CustLedgerEntries');

    const url = `${this.integrationApiUrl}/CustLedgerEntries`;

    // Updated filter structure: include quotes around date values
    const params: Record<string, string> = {
      $filter: `documentType eq 'Payment' and postingDate ge '${startDate}' and postingDate le '${endDate}'`,
      $select:
        'entryNo,customerName,amount,creditAmount,debitAmount,description,documentNo,documentType,dueDate,postingDate,sourceCode,transactionNo',
      $top: '1000',
    };

    const entries: PaymentCustomerLedger[] = [];
    let nextLink: string | undefined = undefined;

    try {
      do {
        const config: AxiosRequestConfig = {
          headers: await this.getHeaders(),
          params: nextLink ? {} : params,
        };

        let response: AxiosResponse<any>;
        if (nextLink) {
          this.logger.debug(`Fetching next page of Customer Ledger payments from ${nextLink}`);
          response = await firstValueFrom(this.httpService.get(nextLink, config));
        } else {
          this.logger.debug(`Fetching customer payments from ${url} with params ${JSON.stringify(params)}`);
          response = await firstValueFrom(this.httpService.get(url, config));
        }

        const fetchedEntries: PaymentCustomerLedger[] = response.data.value.map(
          (entry: any) => ({
            entryNo: entry.entryNo,
            customerName: entry.customerName,
            amount: entry.amount,
            creditAmount: entry.creditAmount,
            debitAmount: entry.debitAmount,
            description: entry.description,
            documentNo: entry.documentNo,
            documentType: entry.documentType,
            dueDate: entry.dueDate ? new Date(entry.dueDate) : undefined, // Convert to Date
            postingDate: entry.postingDate,
            sourceCode: entry.sourceCode,
            transactionNo: entry.transactionNo,
            paymentType: 'CustomerLedger', // Assign default or map accordingly
            depositEntryNo: '', // Assign default or map accordingly
            createdAt: undefined, // Let TypeORM handle it
            updatedAt: undefined, // Let TypeORM handle it
          }),
        );

        entries.push(...fetchedEntries);
        nextLink = response.data['@odata.nextLink'];
      } while (nextLink);

      this.logger.debug(`Fetched ${entries.length} customer payments from CustLedgerEntries`);

      return entries;
    } catch (error: any) {
      this.logger.error('Failed to fetch customer payments from CustLedgerEntries', error);
      if (error.response) {
        this.logger.error(`Error response data: ${JSON.stringify(error.response.data)}`);
      }
      throw new HttpException(
        'Failed to fetch customer payments from CustLedgerEntries',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Fetches invoices associated with a specific payment entryNo.
   * This method is part of the new DSO calculation flow.
   * @param closedByEntryNo - The entryNo that closed the invoice.
   * @returns Array of Invoice objects.
   */
  async getInvoicesByClosedEntryNo(
    closedByEntryNo: number | number[],
  ): Promise<Invoice[]> {
    // Ensure closedByEntryNo is an array
    const closedEntryNos = Array.isArray(closedByEntryNo)
      ? closedByEntryNo
      : [closedByEntryNo];
    this.logger.debug(
      `Fetching invoices closed by entryNo(s): ${closedEntryNos.join(', ')}`,
    );

    const url = `${this.integrationApiUrl}/CustLedgerEntries`;

    // Build filter string
    const filterConditions = closedEntryNos
      .map((entryNo) => `closedByEntryNo eq ${entryNo}`)
      .join(' or ');
    const params: Record<string, string> = {
      $filter: filterConditions,
      $select:
        'entryNo,closedByEntryNo,customerName,customerNo,debitAmount,description,documentDate,documentNo,documentType,dueDate,prepayment',
      $top: '1000',
    };

    const invoices: Invoice[] = [];
    let nextLink: string | undefined = undefined;

    try {
      do {
        const config: AxiosRequestConfig = {
          headers: await this.getHeaders(),
          params: nextLink ? {} : params,
        };

        let response: AxiosResponse<any>;
        if (nextLink) {
          this.logger.debug(`Fetching next page of invoices from ${nextLink}`);
          response = await firstValueFrom(this.httpService.get(nextLink, config));
        } else {
          this.logger.debug(`Fetching invoices from ${url} with params ${JSON.stringify(params)}`);
          response = await firstValueFrom(this.httpService.get(url, config));
        }

        const fetchedInvoices: Invoice[] = response.data.value.map((entry: any) => ({
          entryNo: entry.entryNo,
          closedByEntryNo: entry.closedByEntryNo,
          customerName: entry.customerName,
          customerNo: entry.customerNo,
          debitAmount: entry.debitAmount,
          description: entry.description,
          documentDate: entry.documentDate ? new Date(entry.documentDate) : undefined, // Convert to Date
          dueDate: entry.dueDate ? new Date(entry.dueDate) : undefined, // Convert to Date
          documentNo: entry.documentNo,
          documentType: entry.documentType,
          prepayment: entry.prepayment,
        }));

        invoices.push(...fetchedInvoices);
        this.logger.debug(
          `Fetched ${fetchedInvoices.length} invoices for closedByEntryNo(s): ${closedEntryNos.join(
            ', ',
          )}`,
        );

        nextLink = response.data['@odata.nextLink'];
      } while (nextLink);

      return invoices;
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch invoices for closedByEntryNo(s): ${closedEntryNos.join(
          ', ',
        )}`,
        error,
      );
      if (error.response) {
        this.logger.error(`Error response data: ${JSON.stringify(error.response.data)}`);
      }
      throw new HttpException(
        `Failed to fetch invoices for closedByEntryNo(s): ${closedEntryNos.join(
          ', ',
        )}`,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Fetches payments based on an array of invoice numbers from Customer Ledger Entries.
   * @param invoiceNumbers - Array of invoice numbers.
   * @param startDate - Start date in 'YYYY-MM-DD' format.
   * @param endDate - End date in 'YYYY-MM-DD' format.
   * @returns Array of PaymentCustomerLedger objects.
   */
  async getPaymentsByInvoiceNumbers(
    invoiceNumbers: string[],
    startDate: string,
    endDate: string,
  ): Promise<PaymentCustomerLedger[]> {
    const payments: PaymentCustomerLedger[] = [];
    const batchSize = 15; // Adjust based on API limits

    try {
      for (let i = 0; i < invoiceNumbers.length; i += batchSize) {
        const batch = invoiceNumbers.slice(i, i + batchSize);
        const filterConditions = batch
          .map((num) => `documentNo eq '${num}'`)
          .join(' or ');
        const filterQuery = filterConditions;

        const url = `${this.integrationApiUrl}/CustLedgerEntries?$filter=${filterQuery} and postingDate ge '${startDate}' and postingDate le '${endDate}'`;

        const config: AxiosRequestConfig = {
          headers: await this.getHeaders(),
        };

        const response = await firstValueFrom(this.httpService.get(url, config));

        const fetchedPayments: PaymentCustomerLedger[] = response.data.value.map(
          (entry: any) => ({
            entryNo: entry.entryNo,
            customerName: entry.customerName,
            amount: entry.amount,
            creditAmount: entry.creditAmount,
            debitAmount: entry.debitAmount,
            description: entry.description,
            documentNo: entry.documentNo,
            documentType: entry.documentType,
            dueDate: entry.dueDate ? new Date(entry.dueDate) : undefined, // Convert to Date
            postingDate: entry.postingDate,
            sourceCode: entry.sourceCode,
            transactionNo: entry.transactionNo,
            paymentType: 'CustomerLedger', // Assign default or map accordingly
            depositEntryNo: '', // Assign default or map accordingly
            createdAt: undefined, // Let TypeORM handle it
            updatedAt: undefined, // Let TypeORM handle it
          }),
        );

        payments.push(...fetchedPayments);
      }

      return payments;
    } catch (error: any) {
      this.logger.error('Failed to fetch payments by invoice numbers', error);
      if (error.response) {
        this.logger.error(`Error response data: ${JSON.stringify(error.response.data)}`);
      }
      throw new HttpException(
        'Failed to fetch payments by invoice numbers',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Fetches payments from the generalLedgerEntries endpoint within a date range.
   * @param startDate - Start date in 'YYYY-MM-DD' format.
   * @param endDate - End date in 'YYYY-MM-DD' format.
   * @returns Array of PaymentGL objects.
   */
  async getPayments(
    startDate: string,
    endDate: string,
  ): Promise<PaymentGL[]> {
    this.logger.debug(
      `Fetching payments from G/L between ${startDate} and ${endDate}`,
    );

    const url = `${this.standardApiUrl}/generalLedgerEntries`;

    const params: Record<string, string> = {
      $filter: `postingDate ge '${startDate}' and postingDate le '${endDate}'`,
      $select:
        'entryNo,customerName,amount,creditAmount,debitAmount,description,documentNo,documentNumber,documentType,dueDate,postingDate,sourceCode,transactionNo,itemNumber,totalAmount',
      $top: '1000',
    };

    const payments: PaymentGL[] = [];
    let nextLink: string | undefined = undefined;

    try {
      do {
        const config: AxiosRequestConfig = {
          headers: await this.getHeaders(),
          params: nextLink ? {} : params,
        };

        let response: AxiosResponse<any>;
        if (nextLink) {
          this.logger.debug(
            `Fetching next page of G/L payments from ${nextLink}`,
          );
          response = await firstValueFrom(this.httpService.get(nextLink, config));
        } else {
          this.logger.debug(
            `Fetching G/L payments from ${url} with params ${JSON.stringify(
              params,
            )}`,
          );
          response = await firstValueFrom(this.httpService.get(url, config));
        }

        const fetchedPayments: PaymentGL[] = response.data.value.map(
          (entry: any) => ({
            entryNo: entry.entryNo,
            customerName: entry.customerName,
            amount: entry.amount,
            creditAmount: entry.creditAmount,
            debitAmount: entry.debitAmount,
            description: entry.description,
            documentNo: entry.documentNo,
            documentNumber: entry.documentNumber,
            documentType: entry.documentType,
            dueDate: entry.dueDate ? new Date(entry.dueDate) : undefined, // Convert to Date
            postingDate: entry.postingDate,
            sourceCode: entry.sourceCode,
            transactionNo: entry.transactionNo,
            itemNumber: entry.itemNumber,
            totalAmount: entry.totalAmount,
            paymentType: 'GL',
          }),
        );

        payments.push(...fetchedPayments);
        nextLink = response.data['@odata.nextLink'];
      } while (nextLink);

      this.logger.debug(
        `Fetched ${payments.length} payments from generalLedgerEntries`,
      );

      return payments;
    } catch (error: any) {
      this.logger.error(
        'Failed to fetch payments from generalLedgerEntries',
        error,
      );
      if (error.response) {
        this.logger.error(
          `Error response data: ${JSON.stringify(error.response.data)}`,
        );
      }
      throw new HttpException(
        'Failed to fetch payments from generalLedgerEntries',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Fetches customer payments and associated invoices from CustLedgerEntries.
   * @param customerNumber - The customer number.
   * @param startDate - Start date in 'YYYY-MM-DD' format.
   * @param endDate - End date in 'YYYY-MM-DD' format.
   * @returns Array of payments with associated invoices.
   */
  async getCustomerPaymentsWithInvoices(
    customerNumber: string,
    startDate: string,
    endDate: string,
  ): Promise<any[]> {
    this.logger.debug(`Fetching payments for customer ${customerNumber}`);

    const paymentsUrl = `${this.integrationApiUrl}/CustLedgerEntries`;

    const paymentParams: Record<string, string> = {
      $filter: `documentType eq 'Payment' and postingDate ge '${startDate}' and postingDate le '${endDate}' and customerNo eq '${customerNumber}'`,
      $select:
        'entryNo,customerName,customerNo,amount,creditAmount,debitAmount,description,documentNo,documentType,postingDate',
      $top: '1000',
    };

    const payments: PaymentCustomerLedger[] = [];
    let nextLink: string | undefined = undefined;

    try {
      do {
        const config: AxiosRequestConfig = {
          headers: await this.getHeaders(),
          params: nextLink ? {} : paymentParams,
        };

        let response: AxiosResponse<any>;
        if (nextLink) {
          response = await firstValueFrom(this.httpService.get(nextLink, config));
        } else {
          response = await firstValueFrom(this.httpService.get(paymentsUrl, config));
        }

        if (response.data.value && Array.isArray(response.data.value)) {
          const fetchedPayments: PaymentCustomerLedger[] = response.data.value.map(
            (entry: any) => ({
              entryNo: entry.entryNo,
              customerName: entry.customerName,
              amount: entry.amount,
              creditAmount: entry.creditAmount,
              debitAmount: entry.debitAmount,
              description: entry.description,
              documentNo: entry.documentNo,
              documentType: entry.documentType,
              dueDate: entry.dueDate ? new Date(entry.dueDate) : undefined, // Convert to Date
              postingDate: entry.postingDate,
              sourceCode: entry.sourceCode,
              transactionNo: entry.transactionNo,
              paymentType: 'CustomerLedger', // Assign default or map accordingly
              depositEntryNo: '', // Assign default or map accordingly
              createdAt: undefined, // Let TypeORM handle it
              updatedAt: undefined, // Let TypeORM handle it
            }),
          );

          payments.push(...fetchedPayments);
        } else {
          this.logger.warn(
            `Unexpected response format: ${JSON.stringify(response.data)}`,
          );
        }

        nextLink = response.data['@odata.nextLink'];
      } while (nextLink);

      this.logger.debug(`Fetched ${payments.length} payments for customer ${customerNumber}`);

      // Fetch associated invoices for each payment
      const paymentsWithInvoices = [];

      for (const payment of payments) {
        const paymentEntryNo = payment.entryNo;

        const associatedEntries = await this.getInvoicesByClosedEntryNo(paymentEntryNo);

        // Filter associated entries to include only invoices
        const associatedInvoices = associatedEntries.filter(
          (entry) => entry.documentType === 'Invoice',
        );

        paymentsWithInvoices.push({
          paymentDate: payment.postingDate ? new Date(payment.postingDate) : null,
          paymentAmount: Math.abs(payment.amount || 0), // Use absolute value
          description: payment.description,
          paymentEntryNo: payment.entryNo,
          relatedInvoices: associatedInvoices.map((invoice) => ({
            invoiceNumber: invoice.documentNo,
            invoiceDate: invoice.documentDate ? new Date(invoice.documentDate) : null,
            amount: invoice.debitAmount,
            // Include other fields as needed
          })),
        });
      }

      return paymentsWithInvoices;
    } catch (error: any) {
      const err = error as any;
      this.logger.error(`Failed to fetch payments for customer ${customerNumber}`, error);
      if (err.response) {
        this.logger.error(`Error response data: ${JSON.stringify(err.response.data)}`);
      }
      throw new HttpException(
        'Failed to fetch customer payments',
        err.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
