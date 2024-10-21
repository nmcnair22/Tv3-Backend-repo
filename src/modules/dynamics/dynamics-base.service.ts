import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { DynamicsAuthService } from './dynamics-auth.service';

/**
 * Base service for interacting with Dynamics APIs.
 * Provides common functionalities such as authentication header management
 * and utility methods for HTTP requests.
 */
@Injectable()
export class DynamicsBaseService {
  protected readonly standardApiUrl: string; // For standard APIs (/api/v2.0/)
  protected readonly reportsApiUrl: string; // For reportsFinance APIs
  protected readonly integrationApiUrl: string; // For custom integration APIs (/api/tmc/CISSDMIntegration/v1.0/)
  protected readonly logger = new Logger(DynamicsBaseService.name);

  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
    protected readonly dynamicsAuthService: DynamicsAuthService,
  ) {
    const tenantId = this.configService.get<string>('tenant_id');
    const environmentId = this.configService.get<string>('environment_id');
    const companyId = this.configService.get<string>('company_id');

    if (!tenantId || !environmentId || !companyId) {
      this.logger.error('Missing required configuration parameters for DynamicsBaseService.');
      throw new Error('Missing required configuration parameters for DynamicsBaseService.');
    }

    // Base URL for standard APIs
    this.standardApiUrl = `https://api.businesscentral.dynamics.com/v2.0/${environmentId}/api/v2.0/companies(${companyId})`;

    // Base URL for reportsFinance APIs
    this.reportsApiUrl = `https://api.businesscentral.dynamics.com/v2.0/${tenantId}/${environmentId}/api/microsoft/reportsFinance/v2.0/companies(${companyId})`;

    // Base URL for custom integration APIs
    this.integrationApiUrl = `https://api.businesscentral.dynamics.com/v2.0/${tenantId}/${environmentId}/api/tmc/CISSDMIntegration/v1.0/companies(${companyId})`;
  }

  /**
   * Retrieves the authentication headers required for Dynamics API requests.
   * This method leverages the DynamicsAuthService to obtain valid headers.
   * @returns A promise that resolves to an object containing the necessary headers.
   */
  protected async getHeaders(): Promise<Record<string, string>> {
    try {
      const headers = await this.dynamicsAuthService.getHeaders();
      return headers;
    } catch (error: unknown) {
      this.logger.error(`Failed to retrieve authentication headers: ${(error as Error).message}`);
      throw new HttpException(
        'Failed to retrieve authentication headers',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * Utility method to handle HTTP GET requests with proper error handling.
   * @param url - The endpoint URL to send the GET request to.
   * @param params - Optional query parameters for the request.
   * @param useCustomApi - Boolean flag to determine which API base URL to use.
   * @returns A promise that resolves to the response data of type T.
   */
  protected async httpGet<T>(url: string, params?: Record<string, string>, useCustomApi: boolean = false): Promise<T> {
    const apiUrl = useCustomApi ? this.integrationApiUrl : this.standardApiUrl; // Use the custom API if needed
    const config: AxiosRequestConfig = {
      headers: await this.getHeaders(),
      params,
    };

    try {
      const response: AxiosResponse<T> = await firstValueFrom(this.httpService.get<T>(`${apiUrl}${url}`, config));
      return response.data;
    } catch (error: unknown) {
      this.handleHttpError('GET', `${apiUrl}${url}`, error);
    }
  }

  /**
   * Utility method to handle HTTP POST requests with proper error handling.
   * @param url - The endpoint URL to send the POST request to.
   * @param data - The payload to send in the POST request.
   * @param useCustomApi - Boolean flag to determine which API base URL to use.
   * @returns A promise that resolves to the response data of type T.
   */
  protected async httpPost<T, D = any>(url: string, data: D, useCustomApi: boolean = false): Promise<T> {
    const apiUrl = useCustomApi ? this.integrationApiUrl : this.standardApiUrl; // Use the custom API if needed
    const config: AxiosRequestConfig = {
      headers: await this.getHeaders(),
    };

    try {
      const response: AxiosResponse<T> = await firstValueFrom(this.httpService.post<T>(`${apiUrl}${url}`, data, config));
      return response.data;
    } catch (error: any) {
      this.handleHttpError('POST', `${apiUrl}${url}`, error);
    }
  }

  /**
   * Handles HTTP errors by logging detailed information and throwing appropriate exceptions.
   * @param method - HTTP method (GET, POST, etc.).
   * @param url - The endpoint URL that was called.
   * @param error - The error object caught during the HTTP request.
   */
  private handleHttpError(method: string, url: string, error: any): never {
    if (error.response) {
      // Server responded with a status other than 2xx
      this.logger.error(
        `${method} ${url} failed with status ${error.response.status}: ${error.response.statusText}`,
      );
      this.logger.error(`Response Data: ${JSON.stringify(error.response.data)}`);
      throw new HttpException(
        `External API ${method} ${url} failed: ${error.response.statusText}`,
        error.response.status,
      );
    } else if (error.request) {
      // Request was made but no response received
      this.logger.error(`${method} ${url} failed: No response received.`);
      throw new HttpException(
        `External API ${method} ${url} failed: No response received.`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    } else {
      // Something happened in setting up the request
      this.logger.error(`${method} ${url} failed: ${error.message}`);
      throw new HttpException(
        `External API ${method} ${url} failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
