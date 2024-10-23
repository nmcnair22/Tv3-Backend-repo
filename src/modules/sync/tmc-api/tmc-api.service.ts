// src/modules/sync/tmc-api/tmc-api.service.ts

import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { DynamicsAuthService } from '../../dynamics/dynamics-auth.service';

@Injectable()
export class TmcApiService {
  private readonly logger = new Logger(TmcApiService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly dynamicsAuthService: DynamicsAuthService,
  ) {}

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
  private async getRequest(url: string, params?: Record<string, string>): Promise<any[]> {
    try {
      const headers = await this.dynamicsAuthService.getHeaders();
      const config: AxiosRequestConfig = {
        headers,
        params,
      };

      const response = await firstValueFrom(
        this.httpService.get(url, config),
      );

      this.logger.debug(`GET request to ${url} succeeded with status ${response.status}`);
      return response.data.value; // Assuming OData response
    } catch (error) {
    const err = error as any;
      if (err.response) {
        this.logger.error(`GET request to ${url} failed with status ${err.response.status}: ${err.response.statusText}`);
        this.logger.error(`Response Data: ${JSON.stringify(err.response.data)}`);
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
  async getCustomerLedgerEntries(lastSyncDateTime: Date): Promise<any[]> {
    const url = `${this.baseUrl()}/CustLedgerEntries`;
    const params = {
      '$filter': `lastModifiedDateTime gt ${lastSyncDateTime.toISOString()}`,
    };
    return await this.getRequest(url, params);
  }

/**
 * Fetch ship-to addresses from the TMC API with optional last sync date for incremental sync.
 */
async getShipToAddresses(lastSyncDateTime?: Date): Promise<any[]> {
  const url = `${this.baseUrl()}/shipToAddresses`;
  const params: any = {};
  if (lastSyncDateTime) {
    params['$filter'] = `lastModifiedDateTime gt ${lastSyncDateTime.toISOString()}`;
  }
  return await this.getRequest(url, params);
}

/**
 * Fetch jobs from the TMC API with optional last sync date for incremental sync.
 */
async getJobs(lastSyncDateTime?: Date): Promise<any[]> {
  const url = `${this.baseUrl()}/jobs`;
  const params: any = {};
  if (lastSyncDateTime) {
    params['$filter'] = `lastModifiedDateTime gt ${lastSyncDateTime.toISOString()}`;
  }
  return await this.getRequest(url, params);
}

/**
 * Fetch billing schedule lines from the TMC API.
 * Since there is no lastModifiedDateTime, we fetch all records.
 */
async getBillingScheduleLines(): Promise<any[]> {
  const url = `${this.baseUrl()}/bssiArcbBillingScheduleLines`;
  const params: any = {
    // You can include a $select parameter if you want to limit the fields
    // '$select': '...', // Include fields if needed
  };
  // Remove the $filter parameter since lastModifiedDateTime doesn't exist
  return await this.getRequest(url, params);
}

}