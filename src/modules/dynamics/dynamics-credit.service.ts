//src/modules/dynamics/dynamics-credit.service.ts

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { DynamicsBaseService } from './dynamics-base.service';

export interface CreditEntry {
  entryNumber: number;
  postingDate: string;
  documentNumber: string;
  debitAmount: number;
}

@Injectable()
export class DynamicsCreditService extends DynamicsBaseService {
  /**
   * Fetches credit memos from the generalLedgerEntries endpoint within a date range.
   * @param startDate - Start date in 'YYYY-MM-DD' format.
   * @param endDate - End date in 'YYYY-MM-DD' format.
   * @returns Array of CreditEntry objects.
   */
  async getCreditMemos(startDate: string, endDate: string): Promise<CreditEntry[]> {
    this.logger.debug(`Fetching credit memos from ${startDate} to ${endDate}`);

    const url = `${this.standardApiUrl}/generalLedgerEntries`;
    const params: Record<string, string> = {
      $filter: `documentType eq 'Credit_x0020_Memo' and postingDate ge ${startDate} and postingDate le ${endDate} and debitAmount ge 1`,
      $select: 'entryNumber,postingDate,documentNumber,debitAmount',
      $top: '1000',
    };

    const entries: CreditEntry[] = [];
    let nextLink: string | undefined = undefined;

    try {
      do {
        const config: AxiosRequestConfig = {
          headers: await this.getHeaders(),
          params: nextLink ? {} : params,
        };

        let response: AxiosResponse<{ value: CreditEntry[], '@odata.nextLink'?: string }>;
        if (nextLink) {
          this.logger.debug(`Fetching next page of credit memos from ${nextLink}`);
          response = await firstValueFrom(this.httpService.get(nextLink, config));
        } else {
          this.logger.debug(`Fetching credit memos from ${url} with params ${JSON.stringify(params)}`);
          response = await firstValueFrom(this.httpService.get(url, config));
        }

        const fetchedEntries: CreditEntry[] = response.data.value.map((entry: CreditEntry) => ({
          entryNumber: entry.entryNumber,
          postingDate: entry.postingDate,
          documentNumber: entry.documentNumber,
          debitAmount: entry.debitAmount,
        }));

        entries.push(...fetchedEntries);
        nextLink = response.data['@odata.nextLink'];
      } while (nextLink);

      this.logger.debug(`Fetched ${entries.length} credit memos from generalLedgerEntries`);

      return entries;
    } catch (error: unknown) {
      this.logger.error('Failed to fetch credit memos from generalLedgerEntries', error);
      if (error instanceof Error && (error as { response?: { data?: Record<string, unknown> } }).response) {
        const axiosError = error as { response?: { data?: Record<string, unknown> } };
        this.logger.error(`Error response data: ${JSON.stringify(axiosError.response?.data)}`);
      }
      const status = (error as { response?: { status?: number } }).response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException('Failed to fetch credit memos from generalLedgerEntries', status);
    }
  }
}