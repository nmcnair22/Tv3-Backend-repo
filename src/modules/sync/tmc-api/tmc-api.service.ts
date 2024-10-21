// src/modules/sync/tmc-api/tmc-api.service.ts

import { HttpService } from '@nestjs/axios'; // Ensure this import exists
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamicsAuthService } from '../../dynamics/dynamics-auth.service';
import { DynamicsBaseService } from '../../dynamics/dynamics-base.service';

@Injectable()
export class TmcApiService extends DynamicsBaseService {
  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
    protected readonly dynamicsAuthService: DynamicsAuthService,
  ) {
    super(httpService, configService, dynamicsAuthService); // Correctly passing three arguments
  }

  /**
   * Fetch customers from the TMC Integration API.
   */
  async getTmcCustomers(): Promise<any[]> {
    const endpoint = '/customers'; // Adjust the endpoint as needed
    try {
      const response = await this.httpGet<any>(endpoint, undefined, true); // Changed from any[] to any

      // Log the raw response for debugging
      this.logger.debug(`Raw response from TMC Integration API: ${JSON.stringify(response)}`);

      if (response && Array.isArray(response.value)) { // Directly check for response.value
        this.logger.debug(`Fetched ${response.value.length} customers from TMC Integration API`);
        return response.value;
      } else {
        this.logger.error(`Unexpected response format: ${JSON.stringify(response)}`);
        throw new HttpException(
          'Unexpected response format from TMC Integration API',
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to fetch customers from TMC Integration API: ${error.message}`);
      if (error.response) {
        this.logger.error(`Response Data: ${JSON.stringify(error.response.data)}`);
      }
      throw new HttpException(
        `Failed to fetch customers from TMC Integration API: ${error.message}`,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Example method to post data to the TMC Integration API.
   */
  async createTmcCustomer(customerData: any): Promise<any> {
    const endpoint = '/customers'; // Adjust the endpoint as needed
    try {
      const response = await this.httpPost<any, any>(endpoint, customerData, true); // useCustomApi=true
      this.logger.debug(`Created customer in TMC Integration API at ${endpoint}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to create customer in TMC Integration API: ${error.message}`);
      if (error.response) {
        this.logger.error(`Response Data: ${JSON.stringify(error.response.data)}`);
      }
      throw new HttpException(
        `Failed to create customer in TMC Integration API: ${error.message}`,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Implement additional methods as required
}
