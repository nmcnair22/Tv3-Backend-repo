// src/modules/balance-sheet/balance-sheet.controller.ts
import { Controller, Get, HttpException, HttpStatus, Logger, Query } from '@nestjs/common';
import { BalanceSheetResponse } from '../../common/types/balance-sheet.types';
import { BalanceSheetService } from './balance-sheet.service';

@Controller('balance-sheet')
export class BalanceSheetController {
  private readonly logger = new Logger(BalanceSheetController.name);

  constructor(private readonly balanceSheetService: BalanceSheetService) {}

  @Get()
  async getBalanceSheet(@Query('date') date: string): Promise<BalanceSheetResponse> {
    try {
      if (!date) {
        throw new HttpException('Date is required', HttpStatus.BAD_REQUEST);
      }
      return await this.balanceSheetService.getBalanceSheet(date);
    } catch (error) {
    const err = error as any;
      this.logger.error('Error fetching balance sheet', error);
      throw new HttpException(
        'Error fetching balance sheet',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}