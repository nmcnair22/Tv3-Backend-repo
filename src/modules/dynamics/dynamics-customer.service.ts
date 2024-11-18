// src/modules/dynamics/dynamics-customer.service.ts

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { CustomerFinancialDetail, CustomerFinancialDetailResponse } from '../../common/types/customer-financial-detail.types';
import { DynamicsBaseService } from './dynamics-base.service';
// Removed unused PaymentHistory import
// import { PaymentHistory } from '../sync/entities/payment-history.entity'; 

@Injectable()
export class DynamicsCustomerService extends DynamicsBaseService {

  /**
   * Fetches a customer by their unique number.
   * @param customerNumber - The unique customer number.
   * @returns Customer data.
   */
  async getCustomerByNumber(customerNumber: string): Promise<Record<string, unknown> | null> {
    this.logger.debug(`Fetching customer with number: ${customerNumber}`);

    const url = `${this.standardApiUrl}/customers?$filter=number eq '${customerNumber}'`;

    const config: AxiosRequestConfig = {
      headers: await this.getHeaders(),
    };

    try {
      const response = await firstValueFrom(
        this.httpService.get<{ value: Record<string, unknown>[] }>(url, config),
      );

      if (response.data.value.length === 0) {
        this.logger.warn(`No customer found with number: ${customerNumber}`);
        return null;
      }

      const customer = response.data.value[0];
      this.logger.debug(`Customer fetched: ${JSON.stringify(customer)}`);
      return customer;
    } catch (error) {
      const err = error as { message: string; response?: { data: Record<string, unknown>; status: number } };
      this.logger.error(`Failed to fetch customer ${customerNumber}:`, err.message);
      if (err.response) {
        this.logger.error(`Error response data: ${JSON.stringify(err.response.data)}`);
      }
      throw new HttpException(
        'Failed to fetch customer',
        err.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Fetches financial details for a specific customer.
   * @param customerId - The unique customer ID.
   * @returns Customer financial details.
   */
  async getCustomerFinancialDetails(customerId: string): Promise<CustomerFinancialDetail> {
    this.logger.debug(`Fetching financial details for customer ID: ${customerId}`);

    const url = `${this.standardApiUrl}/customers(${customerId})?$expand=customerFinancialDetail`;

    const config: AxiosRequestConfig = {
      headers: await this.getHeaders(),
    };

    try {
      const response = await firstValueFrom(
        this.httpService.get<CustomerFinancialDetailResponse>(url, config),
      ) as { data: CustomerFinancialDetailResponse };

      this.logger.debug(`Financial details fetched successfully for customer ID: ${customerId}`);
      return response.data.customerFinancialDetail;
    } catch (error) {
      const err = error as { message: string; response?: { data: Record<string, unknown>; status: number } };
      this.logger.error(`Failed to fetch financial details for customer ID ${customerId}: ${err.message}`);
      if (err.response) {
        this.logger.error(`Error response data: ${JSON.stringify(err.response.data)}`);
      }
      throw new HttpException(
        'Failed to fetch customer financial details',
        err.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
