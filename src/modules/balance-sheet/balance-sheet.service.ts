// src/modules/balance-sheet/balance-sheet.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { BalanceSheetResponse } from '../../common/types/balance-sheet.types';
import { DynamicsService } from '../dynamics/dynamics.service';

@Injectable()
export class BalanceSheetService {
  private readonly logger = new Logger(BalanceSheetService.name);

  constructor(private readonly dynamicsService: DynamicsService) {}

  async getBalanceSheet(date: string): Promise<BalanceSheetResponse> {
    try {
      const balanceSheet = await this.dynamicsService.getBalanceSheetStatements(date);
      // Process balanceSheet if needed
      return balanceSheet;
    } catch (error) {
      this.logger.error('Error fetching balance sheet', error);
      throw error;
    }
  }
}