// src/modules/dynamics/dynamics-account.service.ts
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { DynamicsBaseService } from './dynamics-base.service';

@Injectable()
export class DynamicsAccountService extends DynamicsBaseService {
  private readonly logger = new Logger(DynamicsAccountService.name);

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
}
