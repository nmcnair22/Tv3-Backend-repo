// src/modules/dynamics/dynamics-account.service.ts
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { DynamicsBaseService } from './dynamics-base.service';

@Injectable()
export class DynamicsAccountService extends DynamicsBaseService {
  protected readonly logger = new Logger(DynamicsAccountService.name);

  // Fetch income accounts
  async getIncomeAccounts(): Promise<any[]> {
    this.logger.debug('Fetching income accounts');
    const url = `${this.standardApiUrl}/accounts`;

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
    const err = error as any;
      this.logger.error('Failed to fetch income accounts', error);
      if (err.response) {
        this.logger.error(
          `Error response data: ${JSON.stringify(err.response.data)}`,
        );
      }
      throw new HttpException(
        'Failed to fetch income accounts',
        err.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getIncomeCategories(): Promise<Record<string, string>> {
    this.logger.debug('Fetching income accounts');
    const url = `${this.standardApiUrl}/accounts`;

    const params: Record<string, string> = {
      $filter: `category eq 'Income'`,
      $select: 'number,subCategory',
    };

    try {
      const response = await firstValueFrom(this.httpService.get(url, { headers: await this.getHeaders(), params }));
      const incomeAccounts = response.data.value;
      this.logger.debug(`Fetched ${incomeAccounts.length} income accounts`);

      const accountToCategoryMap: Record<string, string> = {};
      incomeAccounts.forEach((account) => {
        accountToCategoryMap[account.number] = account.subCategory || 'Uncategorized Income';
      });

      return accountToCategoryMap;
    } catch (error) {
    const err = error as any;
      this.logger.error('Failed to fetch income accounts', error);
      throw new HttpException('Failed to fetch income accounts', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
