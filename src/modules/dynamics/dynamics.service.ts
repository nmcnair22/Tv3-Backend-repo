// src/services/dynamics.service.ts

import { HttpService } from '@nestjs/axios';
import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';

import { AgedReceivableItem, AgedReceivablesResponse } from '../../common/types/aged-receivables.types';
import { BalanceSheetResponse } from '../../common/types/balance-sheet.types';
import { CashFlowResponse } from '../../common/types/cash-flow.types';
import { IncomeStatementsResponse } from '../../common/types/income-statements.types';

@Injectable()
export class DynamicsService {
  private readonly tokenUrl: string;
  private readonly apiUrl: string;
  private readonly reportsApiUrl: string;
  private readonly logger = new Logger(DynamicsService.name);
  private accessToken: string;
  private accessTokenExpiry: Date;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const tenantId = this.configService.get<string>('tenant_id');
    const environmentId = this.configService.get<string>('environment_id');
    const companyId = this.configService.get<string>('company_id');

    this.tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    // Base URL for standard APIs
    this.apiUrl = `https://api.businesscentral.dynamics.com/v2.0/${environmentId}/api/v2.0/companies(${companyId})`;

    // Base URL for reportsFinance APIs (unchanged)
    this.reportsApiUrl = `https://api.businesscentral.dynamics.com/v2.0/${tenantId}/${environmentId}/api/microsoft/reportsFinance/v2.0/companies(${companyId})`;

    this.logger.debug(`API URL: ${this.apiUrl}`);
    this.logger.debug(`Reports API URL: ${this.reportsApiUrl}`);

    this.accessToken = '';
    this.accessTokenExpiry = new Date();
  }

  // Fetch and cache the access token from Microsoft
  private async fetchAccessToken(): Promise<string> {
    // Check if the token is still valid
    if (this.accessToken && this.accessTokenExpiry > new Date()) {
      return this.accessToken;
    }

    this.logger.debug('Fetching access token from Microsoft');

    const tokenData = {
      client_id: this.configService.get<string>('client_id'),
      client_secret: this.configService.get<string>('client_secret'),
      grant_type: 'client_credentials',
      scope: this.configService.get<string>('scope'),
    };

    const data = new URLSearchParams(tokenData);

    try {
      const response = await firstValueFrom(
        this.httpService.post(this.tokenUrl, data.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );

      this.accessToken = response.data.access_token;
      const expiresIn = response.data.expires_in; // Token validity in seconds
      this.accessTokenExpiry = new Date(new Date().getTime() + expiresIn * 1000);

      this.logger.debug(`Access token fetched successfully`);
      return this.accessToken;
    } catch (error) {
      this.logger.error(`Failed to fetch access token: ${error.message}`);
      if (error.response) {
        this.logger.error(
          `Error response data: ${JSON.stringify(error.response.data)}`,
        );
      }
      throw new HttpException(
        'Failed to fetch access token',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Get headers for API requests
  private async getHeaders(): Promise<any> {
    const accessToken = await this.fetchAccessToken();
    return {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  // Fetch income statements with optional date filters
  async getIncomeStatements(
    startDate?: string,
    endDate?: string,
  ): Promise<IncomeStatementsResponse> {
    this.logger.debug(
      `Service received startDate: ${startDate}, endDate: ${endDate}`,
    );

    const token = await this.fetchAccessToken();
    const url = `${this.apiUrl}/incomeStatements`;

    let filter = '';
    if (startDate && endDate) {
      filter = `dateFilter ge ${startDate} and dateFilter le ${endDate}`;
    } else if (startDate) {
      filter = `dateFilter ge ${startDate}`;
    } else if (endDate) {
      filter = `dateFilter le ${endDate}`;
    }

    const params: Record<string, string> = {};
    if (filter) {
      params.$filter = filter;
    }

    const config: AxiosRequestConfig = {
      headers: await this.getHeaders(),
      params,
    };

    this.logger.debug(
      `Fetching income statements from URL: ${url} with params: ${JSON.stringify(
        params,
      )}`,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.get<IncomeStatementsResponse>(url, config),
      );

      this.logger.debug(`Income statements data fetched successfully`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch income statements: ${error.message}`);
      if (error.response) {
        this.logger.error(
          `Error response data: ${JSON.stringify(error.response.data)}`,
        );
      }
      throw new HttpException(
        'Failed to fetch income statements',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Fetch cash flow statements with optional date filters
  async getCashFlowStatements(
    startDate?: string,
    endDate?: string,
  ): Promise<CashFlowResponse> {
    this.logger.debug(
      `Service received startDate: ${startDate}, endDate: ${endDate}`,
    );

    const token = await this.fetchAccessToken();
    const url = `${this.apiUrl}/cashFlowStatements`;

    let filter = '';
    if (startDate && endDate) {
      filter = `dateFilter ge ${startDate} and dateFilter le ${endDate}`;
    } else if (startDate) {
      filter = `dateFilter ge ${startDate}`;
    } else if (endDate) {
      filter = `dateFilter le ${endDate}`;
    }

    const params: Record<string, string> = {};
    if (filter) {
      params.$filter = filter;
    }

    const config: AxiosRequestConfig = {
      headers: await this.getHeaders(),
      params,
    };

    this.logger.debug(
      `Fetching cash flow statements from URL: ${url} with params: ${JSON.stringify(
        params,
      )}`,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.get<CashFlowResponse>(url, config),
      );

      this.logger.debug(`Cash flow statements data fetched successfully`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch cash flow statements: ${error.message}`);
      if (error.response) {
        this.logger.error(
          `Error response data: ${JSON.stringify(error.response.data)}`,
        );
      }
      throw new HttpException(
        'Failed to fetch cash flow statements',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Fetch balance sheet statements for a specific date
  async getBalanceSheetStatements(date: string): Promise<BalanceSheetResponse> {
    this.logger.debug(`Service received date: ${date}`);
  
    const token = await this.fetchAccessToken();
    const url = `${this.apiUrl}/balanceSheets`;
  
    const params: Record<string, string> = {
      $orderby: 'lineNumber',
      $filter: `dateFilter eq ${date}`,  // Remove quotes around date for correct formatting
    };
  
    const config: AxiosRequestConfig = {
      headers: await this.getHeaders(),
      params,
    };
  
    this.logger.debug(
      `Fetching balance sheet statements from URL: ${url} with params: ${JSON.stringify(
        params,
      )}`,
    );
  
    try {
      const response = await firstValueFrom(
        this.httpService.get<BalanceSheetResponse>(url, config),
      );
  
      this.logger.debug(`Balance sheet statements data fetched successfully`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch balance sheet statements: ${error.message}`);
      if (error.response) {
        this.logger.error(
          `Error response data: ${JSON.stringify(error.response.data)}`,
        );
  
        if (error.response.status === 401) {
          this.logger.warn('Received 401 Unauthorized. Retrying with new token.');
  
          const newToken = await this.fetchAccessToken();
  
          try {
            const retryConfig: AxiosRequestConfig = {
              ...config,
              headers: {
                ...config.headers,
                Authorization: `Bearer ${newToken}`,
              },
            };
            const retryResponse = await firstValueFrom(
              this.httpService.get<BalanceSheetResponse>(url, retryConfig),
            );
            this.logger.debug(
              `Balance sheet statements data fetched successfully after retry`,
            );
            return retryResponse.data;
          } catch (retryError) {
            this.logger.error(`Retry failed: ${retryError.message}`);
            if (retryError.response) {
              this.logger.error(
                `Retry error response data: ${JSON.stringify(
                  retryError.response.data,
                )}`,
              );
            }
            throw new HttpException(
              'Failed to fetch balance sheet statements after retry',
              retryError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }
        }
      }
      throw new HttpException(
        'Failed to fetch balance sheet statements',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

 // Fetch sales invoices within a date range
  async getInvoices(startDate: string, endDate: string): Promise<any[]> {
    this.logger.debug(`Fetching invoices from ${startDate} to ${endDate}`);
    const url = `${this.apiUrl}/salesInvoices`;

    const params: Record<string, string> = {
      $filter: `invoiceDate ge ${startDate} and invoiceDate le ${endDate}`,
      $select: 'id,number,totalAmountIncludingTax,totalAmountExcludingTax,totalTaxAmount',
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

  // Fetch invoice lines for a given invoice
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

  // Fetch customer payments within a date range
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
      return entries; // Return the array of GL entries for customer payments
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

  // Fetch product items
  async getItems(): Promise<any[]> {
    this.logger.debug('Fetching items');
    const url = `${this.apiUrl}/items`;

    const items = [];
    let nextLink: string | undefined = '';

    try {
      do {
        const config: AxiosRequestConfig = {
          headers: await this.getHeaders(),
          params: {
            $top: '1000',
          },
        };

        let response;
        if (nextLink) {
          response = await firstValueFrom(this.httpService.get(nextLink, config));
        } else {
          response = await firstValueFrom(this.httpService.get(url, config));
        }

        items.push(...response.data.value);
        nextLink = response.data['@odata.nextLink'];
      } while (nextLink);

      this.logger.debug(`Fetched ${items.length} items successfully`);
      return items;
    } catch (error) {
      this.logger.error('Failed to fetch items', error);
      if (error.response) {
        this.logger.error(
          `Error response data: ${JSON.stringify(error.response.data)}`,
        );
      }
      throw new HttpException(
        'Failed to fetch items',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Fetch income accounts
  async getIncomeAccounts(): Promise<any[]> {
    this.logger.debug('Fetching income accounts');
    const url = `${this.apiUrl}/accounts`;

    const params: Record<string, string> = {
      $filter: `category eq 'Income'`,
      $select: 'id,number,displayName,category,subCategory',
    };

    const config: AxiosRequestConfig = {
      headers: await this.getHeaders(),
      params,
    };

    try {
      const response = await firstValueFrom(this.httpService.get(url, config));
      const accounts = response.data.value;
      this.logger.debug(`Fetched ${accounts.length} income accounts`);
      return accounts;
    } catch (error) {
      this.logger.error('Failed to fetch income accounts', error);
      if (error.response) {
        this.logger.error(
          `Error response data: ${JSON.stringify(error.response.data)}`,
        );
      }
      throw new HttpException(
        'Failed to fetch income accounts',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Fetch general ledger entries for income accounts
  async getGeneralLedgerEntries(
    accountNumbers: string[],
    startDate: string,
    endDate: string,
  ): Promise<any[]> {
    this.logger.debug('Fetching general ledger entries for income accounts');

    // Build filter string for account numbers
    const accountNumbersFilter = accountNumbers
      .map((num) => `accountNumber eq '${num}'`)
      .join(' or ');

    const url = `${this.apiUrl}/generalLedgerEntries`;

    const params: Record<string, string> = {
      $filter: `(${accountNumbersFilter}) and postingDate ge '${startDate}' and postingDate le '${endDate}'`,
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

      this.logger.debug(`Fetched ${entries.length} general ledger entries`);
      return entries;
    } catch (error) {
      this.logger.error('Failed to fetch general ledger entries', error);
      if (error.response) {
        this.logger.error(
          `Error response data: ${JSON.stringify(error.response.data)}`,
        );
      }
      throw new HttpException(
        'Failed to fetch general ledger entries',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

// Fetch invoices by their numbers
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

// Fetch GL entries by document number
async getGLEntriesByDocumentNumber(documentNumber: string): Promise<any[]> {
  this.logger.debug(`Fetching general ledger entries for document number: ${documentNumber}`);

  const url = `${this.apiUrl}/generalLedgerEntries`;

  // Encoding the documentNumber for safety
  const encodedDocumentNumber = encodeURIComponent(documentNumber);

  // Filtering by documentNumber and adding additional filters to improve matching accuracy
  const params: Record<string, string> = {
    $filter: `documentNumber eq '${documentNumber}'`,
    $select: 'documentNumber,postingDate,description,creditAmount,debitAmount,accountNumber',
  };

  const config: AxiosRequestConfig = {
    headers: await this.getHeaders(),
    params,
  };

  try {
    const response = await firstValueFrom(this.httpService.get(url, config));
    const glEntries = response.data.value;

    this.logger.debug(`Fetched ${glEntries.length} general ledger entries for document number: ${documentNumber}`);
    if (glEntries.length === 0) {
      this.logger.debug(`No GL entries found. Params: ${JSON.stringify(params)}`);
    } else {
      this.logger.debug(`GL Entries Found: ${JSON.stringify(glEntries)}`);
    }

    return glEntries;
  } catch (error) {
    this.logger.error(`Failed to fetch general ledger entries for document number: ${documentNumber}`, error);
    if (error.response) {
      this.logger.error(`Error response data: ${JSON.stringify(error.response.data)}`);
    }
    throw new HttpException(
      `Failed to fetch general ledger entries for document number: ${documentNumber}`,
      error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

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

  try {
    const response = await firstValueFrom(this.httpService.get(url, config));
    return response.data.value;
  } catch (error) {
    this.logger.error(
      `Failed to fetch invoices for customer ${customerNumber}: ${error.message}`,
    );
    throw error;
  }
}

async getPaymentsByInvoiceNumbers(
  invoiceNumbers: string[],
  startDate: string,
  endDate: string,
): Promise<any[]> {
  this.logger.debug(
    `Fetching payments for invoice numbers between ${startDate} and ${endDate}`,
  );

  const payments = [];
  const batchSize = 15; // Adjust based on API limitations

  try {
    for (let i = 0; i < invoiceNumbers.length; i += batchSize) {
      const batchNumbers = invoiceNumbers.slice(i, i + batchSize);

      // Replace '+' with '%2B' in document numbers for OData filter
      const filterConditions = batchNumbers.map((num) => {
        // Escape single quotes in the document number
        let escapedNum = num.replace(/'/g, "''");
        // Replace '+' with '%2B'
        escapedNum = escapedNum.replace(/\+/g, '%2B');
        return `documentNumber eq '${escapedNum}'`;
      });

      const filterQuery = filterConditions.join(' or ');
      const filter = `(${filterQuery}) and postingDate ge ${startDate} and postingDate le ${endDate} and accountNumber eq '13100' and debitAmount gt 0`;

      // Manually construct the full URL including the filter parameter
      const url = `${this.apiUrl}/generalLedgerEntries?$filter=${filter}&$select=documentNumber,postingDate,creditAmount,debitAmount&$top=1000`;

      // Note: Do not encode the '%' in '%2B'. Ensure the '%' is not double-encoded.

      // Set up the headers
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

// Process GL entries using invoice data
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
    this.logger.debug(`Invoice ID: ${invoiceId} has account number: ${accountNumber} and amount: ${invoiceAmount}`);
    
    // Further processing can be implemented here as needed, such as categorizing revenue.
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

 // Fetch aged accounts receivables
 async getAgedReceivables(asOfDate: string, periodLength: string = '30D'): Promise<AgedReceivableItem[]> {
  this.logger.debug(`Fetching aged receivables as of ${asOfDate}`);

  const url = `${this.apiUrl}/agedAccountsReceivables`;

  const params: Record<string, string> = {
    agedAsOfDate: asOfDate,
    periodLengthFilter: periodLength,
    $select: 'customerId,customerNumber,name,balanceDue,currentAmount,period1Amount,period2Amount,period3Amount',
  };

  const config: AxiosRequestConfig = {
    headers: await this.getHeaders(),
    params,
  };

  try {
    const response = await firstValueFrom(
      this.httpService.get<AgedReceivablesResponse>(url, config),
    );

    this.logger.debug(`Aged receivables data fetched successfully`);
    return response.data.value;
  } catch (error) {
    this.logger.error(`Failed to fetch aged receivables: ${error.message}`);
    if (error.response && error.response.data) {
      this.logger.error(`Error response data: ${JSON.stringify(error.response.data)}`);
    }
    throw new HttpException(
      'Failed to fetch aged receivables',
      error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

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

// Method to fetch invoice lines by invoice ID
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


}


