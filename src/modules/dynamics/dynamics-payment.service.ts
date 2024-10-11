// src/modules/dynamics/dynamics-payment.service.ts

import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { DynamicsBaseService } from './dynamics-base.service';

@Injectable()
export class DynamicsPaymentService extends DynamicsBaseService {
  private readonly logger = new Logger(DynamicsPaymentService.name);

  // Method: getPayments
  async getPayments(startDate: string, endDate: string): Promise<any[]> {
    this.logger.debug(`Fetching payments from ${startDate} to ${endDate}`);
    const url = `${this.apiUrl}/customerPayments`;

    const params: Record<string, string> = {
      $filter: `postingDate ge '${startDate}' and postingDate le '${endDate}'`,
      $select: 'id,amount,customerName',
      $top: '1000',
    };

    const payments = [];
    let nextLink: string | undefined = '';

    try {
      do {
        const config: AxiosRequestConfig = {
          headers: await this.getHeaders(),
          params,
        };

        let response;
        if (nextLink) {
          response = await firstValueFrom(this.httpService.get(nextLink, config));
        } else {
          response = await firstValueFrom(this.httpService.get(url, config));
        }

        payments.push(...response.data.value);
        nextLink = response.data['@odata.nextLink'];
      } while (nextLink);

      this.logger.debug(`Fetched ${payments.length} payments successfully`);
      return payments;
    } catch (error) {
      this.logger.error('Failed to fetch payments', error);
      if (error.response) {
        this.logger.error(
          `Error response data: ${JSON.stringify(error.response.data)}`,
        );
      }
      throw new HttpException(
        'Failed to fetch payments',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Method: getCustomerPaymentsFromGL
  async getCustomerPaymentsFromGL(startDate: string, endDate: string): Promise<any[]> {
    this.logger.debug('Fetching customer payments from General Ledger Entries');

    const url = `${this.apiUrl}/generalLedgerEntries`;

    const params: Record<string, string> = {
      $filter: `documentType eq 'Payment' and accountNumber eq '13100' and postingDate ge ${startDate} and postingDate le ${endDate}`,
      $select: 'documentNumber,postingDate,description,creditAmount,accountNumber',
      $top: '1000',
    };

    const entries = [];
    let nextLink: string | undefined = '';

    try {
      do {
        const config: AxiosRequestConfig = {
          headers: await this.getHeaders(),
          params,
        };

        let response;
        if (nextLink) {
          response = await firstValueFrom(this.httpService.get(nextLink, config));
        } else {
          response = await firstValueFrom(this.httpService.get(url, config));
        }

        entries.push(...response.data.value);
        nextLink = response.data['@odata.nextLink'];
      } while (nextLink);

      this.logger.debug(`Fetched ${entries.length} customer payments from GL entries`);
      return entries;
    } catch (error) {
      this.logger.error('Failed to fetch customer payments from GL entries', error);
      if (error.response) {
        this.logger.error(`Error response data: ${JSON.stringify(error.response.data)}`);
      }
      throw new HttpException(
        'Failed to fetch customer payments from GL entries',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Method: getPaymentsByInvoiceNumbers
  async getPaymentsByInvoiceNumbers(
    invoiceNumbers: string[],
    startDate: string,
    endDate: string,
  ): Promise<any[]> {
    this.logger.debug(
      `Fetching payments for invoice numbers between ${startDate} and ${endDate}`,
    );
  
    const payments = [];
    const batchSize = 15;
  
    try {
      for (let i = 0; i < invoiceNumbers.length; i += batchSize) {
        const batchNumbers = invoiceNumbers.slice(i, i + batchSize);
  
        // Escape and encode document numbers
        const filterConditions = batchNumbers.map((num) => {
          const escapedNum = num.replace(/'/g, "''"); // Escape single quotes
          return `documentNumber eq '${escapedNum}'`;
        });
  
        const filterQuery = filterConditions.join(' or ');
        const filter = `(${filterQuery}) and postingDate ge ${startDate} and postingDate le ${endDate} and accountNumber eq '13100' and debitAmount gt 0`;
  
        const encodedFilter = encodeURIComponent(filter);
  
        const url = `${this.apiUrl}/generalLedgerEntries?$filter=${encodedFilter}&$select=documentNumber,postingDate,creditAmount,debitAmount&$top=1000`;
  
        const config: AxiosRequestConfig = {
          headers: await this.getHeaders(),
        };
  
        this.logger.debug(`Fetching payments with URL: ${url}`);
  
        const response = await firstValueFrom(this.httpService.get(url, config));
        const batchPayments = response.data.value;
        payments.push(...batchPayments);
  
        this.logger.debug(`Fetched ${batchPayments.length} payments in this batch.`);
      }
  
      this.logger.debug(`Total payments fetched: ${payments.length}`);
      return payments;
    } catch (error) {
      this.logger.error(
        `Failed to fetch payments by invoice numbers: ${error.message}`,
      );
      if (error.response) {
        this.logger.error(`Error response data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }
    
  }
