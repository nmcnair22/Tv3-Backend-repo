import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { DynamicsAccountService } from './dynamics-account.service';
import { DynamicsAuthService } from './dynamics-auth.service';
import { DynamicsBaseService } from './dynamics-base.service';
import { DynamicsGlEntryService } from './dynamics-glentry.service';

// Import types
import { Invoice, InvoiceLine } from '../../common/types/invoice.types';

@Injectable()
export class DynamicsInvoiceService extends DynamicsBaseService {
  protected readonly logger = new Logger(DynamicsInvoiceService.name);

  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
    private readonly authService: DynamicsAuthService,
    private readonly dynamicsGlEntryService: DynamicsGlEntryService,
    private readonly dynamicsAccountService: DynamicsAccountService
  ) {
    super(httpService, configService, authService);
  }

  /**
   * Fetches invoices within a date range.
   */
  async getInvoices(startDate: string, endDate: string): Promise<{
    number: string;
    invoiceDate: string;
    dueDate: string;
    customerId: string;
    customerNumber: string;
    customerName: string;
    totalAmountIncludingTax: number;
    status: string;
  }[]> {
    this.logger.debug(`Fetching invoices from ${startDate} to ${endDate}`);
    const url = `${this.standardApiUrl}/salesInvoices`;
  
    const params: Record<string, string> = {
      $filter: `invoiceDate ge ${startDate} and invoiceDate le ${endDate}`,
      $select: 'number,invoiceDate,dueDate,customerId,customerNumber,customerName,totalAmountIncludingTax,status',
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
    const err = error as any;
      this.logger.error('Failed to fetch invoices', error);
      if (err.response) {
        this.logger.error(`Error response data: ${JSON.stringify(err.response.data)}`);
      }
      throw new HttpException(
        'Failed to fetch invoices',
        err.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Fetches invoice lines by invoice ID.
   */
  async getInvoiceLines(invoiceId: string): Promise<InvoiceLine[]> {
    this.logger.debug(`Fetching invoice lines for invoice ${invoiceId}`);
    const url = `${this.standardApiUrl}/salesInvoices(${invoiceId})/salesInvoiceLines`;

    const config: AxiosRequestConfig = {
      headers: await this.getHeaders(),
    };

    try {
      const response = await firstValueFrom(this.httpService.get(url, config));
      this.logger.debug(`Fetched invoice lines successfully`);
      return response.data.value as InvoiceLine[]; // Return the array of invoice lines
    } catch (error) {
    const err = error as any;
      this.logger.error(`Failed to fetch invoice lines for invoice ${invoiceId}`, error);
      if (err.response) {
        this.logger.error(`Error response data: ${JSON.stringify(err.response.data)}`);
      }
      throw new HttpException(
        `Failed to fetch invoice lines for invoice ${invoiceId}`,
        err.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

/**
 * Fetches and categorizes revenue by income category within a date range.
 */
async getRevenueByCategory(startDate: string, endDate: string): Promise<{
  totalRevenue: number;
  revenueByCategory: Record<string, number>;
}> {
  this.logger.debug(`Fetching revenue by category from ${startDate} to ${endDate}`);

  // Step 1: Fetch invoices
  const invoices = await this.getInvoices(startDate, endDate);
  const invoiceNumbers = invoices.map((invoice) => invoice.number);

  // Step 2: Fetch income categories
  const incomeCategories = await this.dynamicsAccountService.getIncomeCategories();

  // Step 3: Get GL entries for invoices
  const glEntries = await this.dynamicsGlEntryService.getGLEntriesForInvoices(invoiceNumbers);

  // Step 4: Calculate total revenue and categorize revenue
  let totalRevenue = 0;
  const revenueByCategory: Record<string, number> = {};

  invoices.forEach((invoice) => {
    const invoiceAmount = invoice.totalAmountIncludingTax;
    const accountEntries = glEntries[invoice.number]; // This now contains multiple account numbers and amounts

    if (accountEntries) {
      // Loop through each account number and categorize revenue
      Object.entries(accountEntries).forEach(([accountNumber, amount]) => {
        const category = incomeCategories[accountNumber] || 'Uncategorized Income';
        revenueByCategory[category] = (revenueByCategory[category] || 0) + amount;
      });

      totalRevenue += invoiceAmount;
    } else {
      this.logger.warn(`No account numbers found for invoice ${invoice.number}`);
    }
  });

  this.logger.debug(`Total Revenue: ${totalRevenue}`);
  this.logger.debug(`Revenue by Category: ${JSON.stringify(revenueByCategory)}`);

  return {
    totalRevenue,
    revenueByCategory,
  };
}

  // Fetch a single invoice by its number
  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | null> {
    this.logger.debug(`Fetching invoice with number: ${invoiceNumber}`);
    const url = `${this.standardApiUrl}/salesInvoices`;

    const params = {
      $filter: `number eq '${invoiceNumber}'`,
      $top: 1,
    };

    const config: AxiosRequestConfig = {
      headers: await this.getHeaders(),
      params,
    };

    try {
      const response = await firstValueFrom(this.httpService.get(url, config));
      if (response.data.value && response.data.value.length > 0) {
        return response.data.value[0] as Invoice;
      }
      this.logger.warn(`Invoice with number ${invoiceNumber} not found`);
      return null;
    } catch (error) {
    const err = error as any;
      this.logger.error(`Failed to fetch invoice with number: ${invoiceNumber}`, error);
      throw error;
    }
  }

  // Fetch invoices by customer number within a date range
async getInvoicesByCustomer(customerNumber: string, startDate: string, endDate: string): Promise<Invoice[]> {
  this.logger.debug(`Fetching invoices for customer ${customerNumber} from ${startDate} to ${endDate}`);
  
  const url = `${this.standardApiUrl}/salesInvoices`;

  const params: Record<string, string> = {
    $filter: `customerNumber eq '${customerNumber}' and postingDate ge ${startDate} and postingDate le ${endDate}`,
    $top: '1000',
  };

  const config: AxiosRequestConfig = {
    headers: await this.getHeaders(),
    params,
  };

  try {
    const response = await firstValueFrom(this.httpService.get(url, config));
    return response.data.value as Invoice[];
  } catch (error) {
    const err = error as any;
    this.logger.error(`Failed to fetch invoices for customer ${customerNumber}`, error);
    throw error;
  }
}

  // Fetch invoice lines by invoice ID
  async getInvoiceLinesByInvoiceId(invoiceId: string): Promise<InvoiceLine[]> {
    this.logger.debug(`Fetching invoice lines for invoice ID: ${invoiceId}`);
    const url = `${this.standardApiUrl}/salesInvoices(${invoiceId})/salesInvoiceLines`;

    const config: AxiosRequestConfig = {
      headers: await this.getHeaders(),
    };

    try {
      const response = await firstValueFrom(this.httpService.get(url, config));
      return response.data.value as InvoiceLine[];
    } catch (error) {
    const err = error as any;
      this.logger.error(`Failed to fetch invoice lines for invoice ID: ${invoiceId}`, error);
      throw error;
    }
  }

  // Fetch multiple invoices by their numbers
  async getInvoicesByNumbers(numbers: string[]): Promise<Invoice[]> {
    this.logger.debug(`Fetching invoices by their numbers`);
    const batchSize = 15;
    const invoices: Invoice[] = [];

    try {
      for (let i = 0; i < numbers.length; i += batchSize) {
        const batchNumbers = numbers.slice(i, i + batchSize);
        const filterStrings = batchNumbers.map((num) => `number eq '${num}'`);
        const filterQuery = filterStrings.join(' or ');

        const url = `${this.standardApiUrl}/salesInvoices`;
        const params: Record<string, string> = {
          $filter: filterQuery,
        };

        const config: AxiosRequestConfig = {
          headers: await this.getHeaders(),
          params,
        };

        const response = await firstValueFrom(this.httpService.get(url, config));
        invoices.push(...response.data.value);
      }
      return invoices;
    } catch (error) {
    const err = error as any;
      this.logger.error('Failed to fetch invoices by numbers', error);
      throw error;
    }
  }
}
