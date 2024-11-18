// src/modules/sync/tmc-api/tmc-api.service.ts

import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig } from 'axios';
import axiosRetry from 'axios-retry';
import { firstValueFrom } from 'rxjs';
import { DynamicsAuthService } from '../../dynamics/dynamics-auth.service';
import { BillingScheduleLineData } from '../dto/billing-schedule-line-data.dto';
import { JobData } from '../dto/job-data.dto';
import { ShipToAddressData } from '../dto/ship-to-address-data.dto';
import { TmcCustomerLedgerEntryData } from '../dto/tmc-customer-ledger-entry-data.dto';

@Injectable()
export class TmcApiService {
  private readonly logger = new Logger(TmcApiService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly dynamicsAuthService: DynamicsAuthService,
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
   * Get the base URL for the TMC Integration API.
   */
  private baseUrl(): string {
    const tenantId = this.configService.get<string>('tenant_id');
    const environmentId = this.configService.get<string>('environment_id');
    const companyId = this.configService.get<string>('company_id');
    // Adjust the API path to include the TMC Integration API
    return `https://api.businesscentral.dynamics.com/v2.0/${tenantId}/${environmentId}/api/tmc/CISSDMIntegration/v1.0/companies(${companyId})`;
  }

  /**
   * Make a GET request to the specified URL with authentication and optional query parameters.
   */
  private async getRequest(url: string, params?: Record<string, string | number | boolean>): Promise<unknown[]> {
    const headers = await this.dynamicsAuthService.getHeaders();
    let config: AxiosRequestConfig = {
      headers,
      params,
    };

    let allData: unknown[] = [];
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

        // After the first request, refresh headers and retain params
        config = {
          headers: await this.dynamicsAuthService.getHeaders(), // Refresh headers
          params,
        };

        // Log the number of records fetched so far
        this.logger.debug(`Fetched ${allData.length} records from ${url}`);

      } while (nextUrl);

      return allData;
    } catch (error) {
      const err = error as { response?: { status: number; statusText: string; data: Record<string, unknown>; headers: Record<string, string> }; request?: unknown; message: string; config?: { url?: string } };

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
   * Fetch customer ledger entries from the TMC API.
   * @param lastSyncDateTime The timestamp of the last successful synchronization.
   */
  async getCustomerLedgerEntries(lastSyncDateTime?: Date): Promise<TmcCustomerLedgerEntryData[]> {
    const url = `${this.baseUrl()}/CustLedgerEntries`;
    const params: Record<string, string> = {};
    if (lastSyncDateTime) {
      params['$filter'] = `lastModifiedDateTime gt ${lastSyncDateTime.toISOString()}`;
    }

    // Cast the response to TmcCustomerLedgerEntryData[]
    return await this.getRequest(url, params) as TmcCustomerLedgerEntryData[];
  }

/**
 * Fetch ship-to addresses from the TMC API with optional last sync date for incremental sync.
 */
async getShipToAddresses(lastSyncDateTime?: Date): Promise<ShipToAddressData[]> {
  const url = `${this.baseUrl()}/shipToAddresses`;
  const params: Record<string, string> = {};
  if (lastSyncDateTime) {
    params['$filter'] = `lastModifiedDateTime gt ${lastSyncDateTime.toISOString()}`;
  }

  const response = await this.getRequest(url, params);

  // Cast each record in the response to ShipToAddressData
  return response.map((data) => data as ShipToAddressData);
}

/**
 * Fetch jobs from the TMC API with optional last sync date for incremental sync.
 */
async getJobs(lastSyncDateTime?: Date): Promise<JobData[]> {
  const url = `${this.baseUrl()}/jobs`;
  const params: Record<string, string> = {};
  if (lastSyncDateTime) {
    params['$filter'] = `lastModifiedDateTime gt ${lastSyncDateTime.toISOString()}`;
  }
  const response = await this.getRequest(url, params);
  
  return response.map((data) => data as JobData);
}

  /**
   * Fetch billing schedule lines from the TMC API.
   * Since there is no lastModifiedDateTime, we fetch all records.
   */
  async getBillingScheduleLines(): Promise<BillingScheduleLineData[]> {
    const url = `${this.baseUrl()}/bssiArcbBillingScheduleLines`;
    const params: Record<string, string> = {};
    const response = await this.getRequest(url, params);
  
    return response.map((data) => data as BillingScheduleLineData);
  }
}