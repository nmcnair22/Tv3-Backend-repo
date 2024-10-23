// src/modules/balance-sheet/balance-sheet.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { BalanceSheetResponse } from '../../common/types/balance-sheet.types';
import { DynamicsReportsService } from '../dynamics/dynamics-reports.service';

@Injectable()
export class BalanceSheetService {
  private readonly logger = new Logger(BalanceSheetService.name);

  constructor(private readonly dynamicsReportsService: DynamicsReportsService) {}

  async getBalanceSheet(date: string): Promise<BalanceSheetResponse> {
    try {
      const balanceSheet = await this.dynamicsReportsService.getBalanceSheetStatements(date);
      return balanceSheet;
    } catch (error) {
    const err = error as any;
      this.logger.error('Error fetching balance sheet', error);
      throw error;
    }
  }
}
