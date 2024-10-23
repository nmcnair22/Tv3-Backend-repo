// src/modules/dynamics/dynamics-reports.service.ts

import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AgedReceivableItem } from '../../common/types/aged-receivables.types';
import { BalanceSheetResponse } from '../../common/types/balance-sheet.types';
import { CashFlowResponse } from '../../common/types/cash-flow.types';
import { IncomeStatementsResponse } from '../../common/types/income-statements.types';
import { DynamicsBaseService } from './dynamics-base.service';

@Injectable()
export class DynamicsReportsService extends DynamicsBaseService {
  protected readonly logger = new Logger(DynamicsReportsService.name);

  // Method: getIncomeStatements
  async getIncomeStatements(
    startDate?: string,
    endDate?: string,
  ): Promise<IncomeStatementsResponse> {
    this.logger.debug(
      `Service received startDate: ${startDate}, endDate: ${endDate}`,
    );

    const url = `${this.standardApiUrl}/incomeStatements`;

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
      ) as { data: IncomeStatementsResponse };

      this.logger.debug(`Income statements data fetched successfully`);
      return response.data;
    } catch (error) {
    const err = error as any;
      this.logger.error(`Failed to fetch income statements: ${err.message}`);
      if (err.response) {
        this.logger.error(
          `Error response data: ${JSON.stringify(err.response.data)}`,
        );
      }
      throw new HttpException(
        'Failed to fetch income statements',
        err.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Method: getCashFlowStatements
  async getCashFlowStatements(
    startDate?: string,
    endDate?: string,
  ): Promise<CashFlowResponse> {
    this.logger.debug(`Fetching cash flow statements`);

    const url = `${this.standardApiUrl}/cashFlowStatements`;

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

    try {
      const response = await firstValueFrom(
        this.httpService.get<CashFlowResponse>(url, config),
      ) as { data: CashFlowResponse };

      this.logger.debug(`Cash flow statements data fetched successfully`);
      return response.data;
    } catch (error) {
    const err = error as any;
      this.logger.error(`Failed to fetch cash flow statements: ${err.message}`);
      if (err.response) {
        this.logger.error(
          `Error response data: ${JSON.stringify(err.response.data)}`,
        );
      }
      throw new HttpException(
        'Failed to fetch cash flow statements',
        err.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Method: getBalanceSheetStatements
  async getBalanceSheetStatements(date: string): Promise<BalanceSheetResponse> {
    this.logger.debug(`Fetching balance sheet statements for date: ${date}`);

    const url = `${this.standardApiUrl}/balanceSheets`;

    const params: Record<string, string> = {
      $orderby: 'lineNumber',
      $filter: `dateFilter eq ${date}`,
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
      ) as { data: BalanceSheetResponse };

      this.logger.debug(`Balance sheet statements data fetched successfully`);
      return response.data;
    } catch (error) {
    const err = error as any;
      this.logger.error(`Failed to fetch balance sheet statements: ${err.message}`);
      if (err.response) {
        this.logger.error(
          `Error response data: ${JSON.stringify(err.response.data)}`,
        );
      }
      throw new HttpException(
        'Failed to fetch balance sheet statements',
        err.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Method: getAgedReceivables
  async getAgedReceivables(
    asOfDate: string,
    periodLength: string = '30D',
  ): Promise<AgedReceivableItem[]> {
    this.logger.debug(`Fetching aged receivables as of ${asOfDate}`);

    const url = `${this.standardApiUrl}/agedAccountsReceivables`;

    const params: Record<string, string> = {
      agedAsOfDate: asOfDate,
      periodLengthFilter: periodLength,
      $select:
        'customerId,customerNumber,name,balanceDue,currentAmount,period1Amount,period2Amount,period3Amount',
    };

    const config: AxiosRequestConfig = {
      headers: await this.getHeaders(),
      params,
    };

    try {
      const response = await firstValueFrom(this.httpService.get<{ value: AgedReceivableItem[] }>(url, config)) as { data: { value: AgedReceivableItem[] } };
      this.logger.debug(`Aged receivables data fetched successfully`);
      return response.data.value;
    } catch (error) {
    const err = error as any;
      this.logger.error(`Failed to fetch aged receivables: ${err.message}`);
      if (err.response && err.response.data) {
        this.logger.error(`Error response data: ${JSON.stringify(err.response.data)}`);
      }
      throw new HttpException(
        'Failed to fetch aged receivables',
        err.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
