// src/modules/dynamics/dynamics-invoice.service.ts

import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { DynamicsBaseService } from './dynamics-base.service';

@Injectable()
export class DynamicsInvoiceService extends DynamicsBaseService {
  private readonly logger = new Logger(DynamicsInvoiceService.name);

  // Method: getInvoices
  async getInvoices(startDate: string, endDate: string): Promise<any[]> {
    this.logger.debug(`Fetching invoices from ${startDate} to ${endDate}`);
    const url = `${this.apiUrl}/salesInvoices`;

    const params: Record<string, string> = {
      $filter: `invoiceDate ge ${startDate} and invoiceDate le ${endDate}`,
      $select:
        'id,number,totalAmountIncludingTax,totalAmountExcludingTax,totalTaxAmount',
      $top: '1000',
    };

    const invoices = [];
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

        invoices.push(...response.data.value);
        nextLink = response.data['@odata.nextLink'];
      } while (nextLink);

      this.logger.debug(`Fetched ${invoices.length} invoices successfully`);
      return invoices;
    } catch (error) {
      this.logger.error('Failed to fetch invoices', error);
      if (error.response) {
        this.logger.error(
          `Error response data: ${JSON.stringify(error.response.data)}`,
        );
      }
      throw new HttpException(
        'Failed to fetch invoices',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Method: getInvoiceLines
  async getInvoiceLines(invoiceId: string): Promise<any[]> {
    this.logger.debug(`Fetching invoice lines for invoice ${invoiceId}`);
    const url = `${this.apiUrl}/salesInvoices(${invoiceId})/salesInvoiceLines`;

    const config: AxiosRequestConfig = {
      headers: await this.getHeaders(),
    };

    try {
      const response = await firstValueFrom(this.httpService.get(url, config));
      this.logger.debug(`Fetched invoice lines successfully`);
      return response.data.value; // Return the array of invoice lines
    } catch (error) {
      this.logger.error(`Failed to fetch invoice lines for invoice ${invoiceId}`, error);
      if (error.response) {
        this.logger.error(
          `Error response data: ${JSON.stringify(error.response.data)}`,
        );
      }
      throw new HttpException(
        `Failed to fetch invoice lines for invoice ${invoiceId}`,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Method: getInvoiceByNumber
  async getInvoiceByNumber(invoiceNumber: string): Promise<any> {
    this.logger.debug(`Fetching invoice with number: ${invoiceNumber}`);
    const url = `${this.apiUrl}/salesInvoices`;

    const params = {
      $filter: `number eq '${invoiceNumber}'`,
      $select: 'id,number,customerName,postingDate,totalAmountIncludingTax',
      $top: 1,
    };

    const config: AxiosRequestConfig = {
      headers: await this.getHeaders(),
      params,
    };

    try {
      const response = await firstValueFrom(this.httpService.get(url, config));
      if (response.data.value && response.data.value.length > 0) {
        const invoice = response.data.value[0];
        this.logger.debug(`Found invoice: ${JSON.stringify(invoice)}`);
        return invoice;
      } else {
        this.logger.warn(`Invoice with number ${invoiceNumber} not found`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Error fetching invoice by number: ${error.message}`);
      throw error;
    }
  }

  // Method: getInvoicesByNumbers
  async getInvoicesByNumbers(numbers: string[]): Promise<any[]> {
    this.logger.debug('Fetching invoices by numbers');

    const batchSize = 15; // Adjust batch size based on API limitations
    const invoices = [];

    try {
      for (let i = 0; i < numbers.length; i += batchSize) {
        const batchNumbers = numbers.slice(i, i + batchSize);
        const filterStrings = batchNumbers.map((num) => `number eq '${num}'`);
        const filterQuery = filterStrings.join(' or ');
        const url = `${this.apiUrl}/salesInvoices`;

        const params: Record<string, string> = {
          $filter: filterQuery,
          $select: 'number,customerNumber,customerName',
        };

        const config: AxiosRequestConfig = {
          headers: await this.getHeaders(),
          params,
        };

        const response = await firstValueFrom(this.httpService.get(url, config));
        invoices.push(...response.data.value);
      }

      this.logger.debug(`Fetched ${invoices.length} invoices by numbers`);
      return invoices;
    } catch (error) {
      this.logger.error('Failed to fetch invoices by numbers', error);
      if (error.response) {
        this.logger.error(`Error response data: ${JSON.stringify(error.response.data)}`);
      }
      throw new HttpException(
        'Failed to fetch invoices by numbers',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Method: getInvoicesByCustomer
  async getInvoicesByCustomer(
    customerNumber: string,
    startDate: string,
    endDate: string,
  ): Promise<any[]> {
    this.logger.debug(
      `Fetching invoices for customer ${customerNumber} from ${startDate} to ${endDate}`,
    );
  
    const url = `${this.apiUrl}/salesInvoices`;
    const params = {
      $filter: `customerNumber eq '${customerNumber}' and postingDate ge ${startDate} and postingDate le ${endDate}`,
      $select: 'number,postingDate,customerNumber',
      $top: '1000',
    };
  
    const config = {
      headers: await this.getHeaders(),
      params,
    };
  
    // Additional logging
    this.logger.debug(`URL: ${url}`);
    this.logger.debug(`Params: ${JSON.stringify(params)}`);
  
    try {
      const response = await firstValueFrom(this.httpService.get(url, config));
      this.logger.debug(`Response Data: ${JSON.stringify(response.data)}`);
      return response.data.value;
    } catch (error) {
      this.logger.error(
        `Failed to fetch invoices for customer ${customerNumber}: ${error.message}`,
      );
      if (error.response && error.response.data) {
        this.logger.error(
          `Error response data: ${JSON.stringify(error.response.data)}`,
        );
      }
      throw error;
    }
  }
    
  // Method: getInvoiceLinesByInvoiceId
  async getInvoiceLinesByInvoiceId(invoiceId: string): Promise<any[]> {
    this.logger.debug(`Fetching invoice lines for invoiceId: ${invoiceId}`);
    const url = `${this.apiUrl}/salesInvoices(${invoiceId})/salesInvoiceLines`;

    const config: AxiosRequestConfig = {
      headers: await this.getHeaders(),
    };

    try {
      const response = await firstValueFrom(this.httpService.get(url, config));
      const invoiceLines = response.data.value;
      this.logger.debug(`Fetched ${invoiceLines.length} invoice lines`);
      return invoiceLines;
    } catch (error) {
      this.logger.error(`Error fetching invoice lines: ${error.message}`);
      throw error;
    }
  }

  // Method: processInvoiceGL
  async processInvoiceGL(invoiceId: string, invoiceAmount: number): Promise<void> {
    this.logger.debug(`Processing general ledger entries for invoice ID: ${invoiceId}`);

    const url = `${this.apiUrl}/generalLedgerEntries`;

    const params: Record<string, string> = {
      $filter: `documentNumber eq '${invoiceId}'`,
      $select: 'documentNumber,accountNumber',
    };

    const config: AxiosRequestConfig = {
      headers: await this.getHeaders(),
      params,
    };

    try {
      const response = await firstValueFrom(this.httpService.get(url, config));
      const entries = response.data.value;

      if (entries.length === 0) {
        this.logger.warn(`No GL entries found for invoice ID: ${invoiceId}`);
        return;
      }

      // Use the first entry to determine account number
      const accountNumber = entries[0].accountNumber;

      // Log the account and invoice amount
      this.logger.debug(
        `Invoice ID: ${invoiceId} has account number: ${accountNumber} and amount: ${invoiceAmount}`,
      );

      // Further processing can be implemented here as needed
    } catch (error) {
      this.logger.error(`Failed to process GL entries for invoice ID: ${invoiceId}`, error);
      if (error.response) {
        this.logger.error(`Error response data: ${JSON.stringify(error.response.data)}`);
      }
      throw new HttpException(
        'Failed to process GL entries for invoice',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
