// src/modules/sync/v2-api/v2-api.service.ts

import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig } from 'axios';
import axiosRetry from 'axios-retry';
import { firstValueFrom } from 'rxjs';
import { DynamicsAuthService } from 'src/modules/dynamics/dynamics-auth.service'; // Adjust path if necessary

@Injectable()
export class V2ApiService {
  private readonly logger = new Logger(V2ApiService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly dynamicsAuthService: DynamicsAuthService,
    private readonly configService: ConfigService,
  ) {
    // Configure axios-retry for the HttpService instance
    axiosRetry(this.httpService.axiosRef, {
      retries: 5,
      retryDelay: (retryCount) => {
        return axiosRetry.exponentialDelay(retryCount);
      },
      shouldResetTimeout: true,
      retryCondition: (error) => {
        // Retry on network errors or 5xx status codes
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status >= 500;
      },
    });
  }

  /**
   * Get the base URL for the API.
   */
  private baseUrl(): string {
    const tenantId = this.configService.get<string>('tenant_id');
    const environmentId = this.configService.get<string>('environment_id');
    const companyId = this.configService.get<string>('company_id');
    return `https://api.businesscentral.dynamics.com/v2.0/${tenantId}/${environmentId}/api/v2.0/companies(${companyId})`;
  }

  /**
   * Make a GET request to the specified URL with authentication and optional query parameters.
   */
  private async getRequest<T>(url: string, params?: Record<string, string | number | boolean>): Promise<T[]> {
    const headers = await this.dynamicsAuthService.getHeaders();
    let config: AxiosRequestConfig = {
      headers,
      params,
    };

    let allData: T[] = [];
    let nextUrl: string | undefined = url;

    try {
      do {
        this.logger.debug(`Requesting URL: ${nextUrl}`);

        const response = await firstValueFrom(this.httpService.get(nextUrl, config));

        // Append data
        if (response.data.value) {
          allData = allData.concat(response.data.value);
        } else {
          // In case the response data is an object, not wrapped in 'value'
          allData.push(response.data);
        }

        // Check for nextLink
        nextUrl = response.data['@odata.nextLink'];

        // After the first request, remove 'params' from 'config' as 'nextUrl' includes all query parameters
        config = {
          headers: await this.dynamicsAuthService.getHeaders(), // Refresh headers
        };

        // Log the number of records fetched so far
        this.logger.debug(`Fetched ${allData.length} records from ${url}`);

      } while (nextUrl);

      return allData;
    } catch (error) {
      const err = error as { response?: { status: number; statusText: string; data: any; headers: any }; request?: any; message: string; config?: { url?: string } };

      // Handle specific HTTP errors
      if (err.response) {
        const statusCode = err.response.status;
        const statusText = err.response.statusText;
        const requestUrl = err.config?.url || url;

        this.logger.error(`GET request to ${requestUrl} failed with status ${statusCode}: ${statusText}`);
        this.logger.error(`Response Data: ${JSON.stringify(err.response.data)}`);

        if (statusCode === 429) {
          // Handle rate limiting
          const retryAfter = err.response.headers['retry-after'];
          const delay = (parseInt(retryAfter, 10) || 5) * 1000; // Default to 5 seconds
          this.logger.warn(`Received 429 Too Many Requests. Retrying after ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          // Retry the request
          return this.getRequest(url, params);
        }
      } else if (err.request) {
        this.logger.error(`GET request to ${url} failed: No response received.`);
      } else {
        this.logger.error(`GET request to ${url} failed: ${err.message}`);
      }

      throw new HttpException(
        `Failed to fetch data from ${url}`,
        err.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Fetch customers from the API with optional last sync date for incremental sync.
   */
  async getCustomers(lastSyncDateTime?: Date): Promise<any[]> {
    const url = `${this.baseUrl()}/customers`;
    const params: any = {
      // Removed $select and $top to retrieve all fields and allow default pagination
    };
    if (lastSyncDateTime) {
      params.$filter = `lastModifiedDateTime gt ${lastSyncDateTime.toISOString()}`;
    }
    return await this.getRequest(url, params);
  }

  /**
   * Fetch a customer by ID.
   */
  async getCustomerById(customerId: string): Promise<any> {
    const url = `${this.baseUrl()}/customers(${customerId})`;

    const headers = await this.dynamicsAuthService.getHeaders();

    const config: AxiosRequestConfig = {
      headers,
    };

    try {
      const response = await firstValueFrom(this.httpService.get(url, config));
      return response.data;
    } catch (error) {
      const err = error as any;
      this.logger.error(`Failed to fetch customer ${customerId}`, err.stack);
      if (err.response) {
        this.logger.error(`Error response data: ${JSON.stringify(err.response.data)}`);
      }
      return null;
    }
  }

  /**
   * Fetch vendors from the API with optional last sync date for incremental sync.
   */
  async getVendors(lastSyncDateTime?: Date): Promise<any[]> {
    const url = `${this.baseUrl()}/vendors`;
    const params: any = {
      // Removed $select and $top to retrieve all fields and allow default pagination
    };
    if (lastSyncDateTime) {
      params.$filter = `lastModifiedDateTime gt ${lastSyncDateTime.toISOString()}`;
    }
    return await this.getRequest(url, params);
  }

  /**
   * Fetch a vendor by ID.
   */
  async getVendorById(vendorId: string): Promise<any> {
    const url = `${this.baseUrl()}/vendors(${vendorId})`;
    const headers = await this.dynamicsAuthService.getHeaders();

    const config: AxiosRequestConfig = {
      headers,
    };

    try {
      const response = await firstValueFrom(this.httpService.get(url, config));
      return response.data;
    } catch (error) {
      const err = error as any;
      this.logger.error(`Failed to fetch vendor ${vendorId}`, err.stack);
      if (err.response) {
        this.logger.error(`Error response data: ${JSON.stringify(err.response.data)}`);
      }
      return null;
    }
  }

  /**
   * Fetch items from the API with optional last sync date for incremental sync.
   */
  async getItems(lastSyncDateTime?: Date): Promise<any[]> {
    const url = `${this.baseUrl()}/items`;
    const params: any = {
      // Removed $select and $top to retrieve all fields and allow default pagination
    };
    if (lastSyncDateTime) {
      params.$filter = `lastModifiedDateTime gt ${lastSyncDateTime.toISOString()}`;
    }
    return await this.getRequest(url, params);
  }

  /**
   * Fetch sales invoices from the API with optional last sync date for incremental sync.
   */
  async getSalesInvoices(lastSyncDateTime?: Date): Promise<any[]> {
    const url = `${this.baseUrl()}/salesInvoices`;
    const params: any = {
      // No $select or $top parameters to retrieve all fields and allow default pagination
    };
    if (lastSyncDateTime) {
      params.$filter = `lastModifiedDateTime gt ${lastSyncDateTime.toISOString()}`;
    }
    return await this.getRequest(url, params);
  }

  /**
   * Fetch sales invoice lines for a specific invoice.
   * @param invoiceId The ID of the sales invoice.
   */
  async getSalesInvoiceLines(invoiceId: string): Promise<any[]> {
    const url = `${this.baseUrl()}/salesInvoices(${invoiceId})/salesInvoiceLines`;
    const params = {
      // Removed $select and $top to retrieve all fields and allow default pagination
    };
    return await this.getRequest(url, params);
  }

  /**
   * Fetch sales credit memos from the API with optional last sync date for incremental sync.
   */
  async getSalesCreditMemos(lastSyncDateTime?: Date): Promise<any[]> {
    const url = `${this.baseUrl()}/salesCreditMemos`;
    const params: any = {
      // Removed $select and $top to retrieve all fields and allow default pagination
    };
    if (lastSyncDateTime) {
      params.$filter = `lastModifiedDateTime gt ${lastSyncDateTime.toISOString()}`;
    }
    return await this.getRequest(url, params);
  }

  /**
   * Fetch sales credit memo lines for a specific credit memo.
   * @param creditMemoId The ID of the sales credit memo.
   */
  async getSalesCreditMemoLines(creditMemoId: string): Promise<any[]> {
    const url = `${this.baseUrl()}/salesCreditMemos(${creditMemoId})/salesCreditMemoLines`;
    const params = {
      // Removed $select and $top to retrieve all fields and allow default pagination
    };
    return await this.getRequest(url, params);
  }

  /**
   * Fetch purchase invoices from the API with optional last sync date for incremental sync.
   */
  async getPurchaseInvoices(lastSyncDateTime?: Date): Promise<any[]> {
    const url = `${this.baseUrl()}/purchaseInvoices`;
    const params: any = {
      // Removed $select and $top to retrieve all fields and allow default pagination
    };
    if (lastSyncDateTime) {
      params.$filter = `lastModifiedDateTime gt ${lastSyncDateTime.toISOString()}`;
    }
    return await this.getRequest(url, params);
  }

  /**
   * Fetch purchase invoice lines for a specific invoice.
   * @param invoiceId The ID of the purchase invoice.
   */
  async getPurchaseInvoiceLines(invoiceId: string): Promise<any[]> {
    const url = `${this.baseUrl()}/purchaseInvoices(${invoiceId})/purchaseInvoiceLines`;
    const params = {
      // Removed $select and $top to retrieve all fields and allow default pagination
    };
    return await this.getRequest(url, params);
  }

  /**
   * Fetch purchase orders from the API with optional last sync date for incremental sync.
   */
  async getPurchaseOrders(lastSyncDateTime?: Date): Promise<any[]> {
    const url = `${this.baseUrl()}/purchaseOrders`;
    const params: any = {
      // Removed $select and $top to retrieve all fields and allow default pagination
    };
    if (lastSyncDateTime) {
      params.$filter = `lastModifiedDateTime gt ${lastSyncDateTime.toISOString()}`;
    }
    return await this.getRequest(url, params);
  }

  /**
   * Fetch purchase order lines for a specific purchase order.
   * @param purchaseOrderId The ID of the purchase order.
   */
  async getPurchaseOrderLines(purchaseOrderId: string): Promise<any[]> {
    const url = `${this.baseUrl()}/purchaseOrders(${purchaseOrderId})/purchaseOrderLines`;
    const params = {
      // Removed $select and $top to retrieve all fields and allow default pagination
    };
    return await this.getRequest(url, params);
  }

  /**
   * Fetch purchase credit memos from the API with optional last sync date for incremental sync.
   */
  async getPurchaseCreditMemos(lastSyncDateTime?: Date): Promise<any[]> {
    const url = `${this.baseUrl()}/purchaseCreditMemos`;
    const params: any = {
      // Removed $select and $top to retrieve all fields and allow default pagination
    };
    if (lastSyncDateTime) {
      params.$filter = `lastModifiedDateTime gt ${lastSyncDateTime.toISOString()}`;
    }
    return await this.getRequest(url, params);
  }

  /**
   * Fetch purchase credit memo lines for a specific credit memo.
   * @param creditMemoId The ID of the purchase credit memo.
   */
  async getPurchaseCreditMemoLines(creditMemoId: string): Promise<any[]> {
    const url = `${this.baseUrl()}/purchaseCreditMemos(${creditMemoId})/purchaseCreditMemoLines`;
    const params = {
      // Removed $select and $top to retrieve all fields and allow default pagination
    };
    return await this.getRequest(url, params);
  }

/**
 * Fetch general ledger entries from the API with optional last sync date for incremental sync.
 */
async getGeneralLedgerEntries(lastSyncDateTime?: Date): Promise<any[]> {
  const url = `${this.baseUrl()}/generalLedgerEntries`;
  const params: any = {};

  // Only apply filtering for incremental syncs
  if (lastSyncDateTime) {
    params.$filter = `lastModifiedDateTime gt ${lastSyncDateTime.toISOString()}`;
  }

  return await this.getRequest(url, params);
}

  /**
   * Fetch accounts from the API with optional last sync date for incremental sync.
   */
  async getAccounts(lastSyncDateTime?: Date): Promise<any[]> {
    const url = `${this.baseUrl()}/accounts`;
    const params: any = {
      // Removed $select and $top to retrieve all fields and allow default pagination
    };
    if (lastSyncDateTime) {
      params.$filter = `lastModifiedDateTime gt ${lastSyncDateTime.toISOString()}`;
    }
    return await this.getRequest(url, params);
  }

  /**
   * Fetch bank accounts from the API with optional last sync date for incremental sync.
   */
  async getBankAccounts(lastSyncDateTime?: Date): Promise<any[]> {
    const url = `${this.baseUrl()}/bankAccounts`;
    const params: any = {
      // Removed $select and $top to retrieve all fields and allow default pagination
    };
    if (lastSyncDateTime) {
      params.$filter = `lastModifiedDateTime gt ${lastSyncDateTime.toISOString()}`;
    }
    return await this.getRequest(url, params);
  }

  async getCustomerByNumber(customerNumber: string): Promise<any> {
    try {
      const filter = `number eq '${customerNumber}'`;
      const url = `${this.baseUrl()}/customers?$filter=${encodeURIComponent(filter)}`;
      const headers = await this.dynamicsAuthService.getHeaders();
      const config: AxiosRequestConfig = { headers };
  
      this.logger.debug(`Requesting customer with number: ${customerNumber}`);
  
      const response = await firstValueFrom(this.httpService.get(url, config));
      const customers = response.data.value;
  
      if (customers && customers.length > 0) {
        return customers[0];
      } else {
        return null;
      }
    } catch (error) {
      const err = error as any;
      this.logger.error(`Failed to fetch customer with number ${customerNumber}`, err.stack);
      if (err.response) {
        this.logger.error(`Error response data: ${JSON.stringify(err.response.data)}`);
      }
      return null;
    }
  }

}