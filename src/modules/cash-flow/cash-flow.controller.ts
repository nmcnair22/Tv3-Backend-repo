// src/modules/cash-flow/cash-flow.controller.ts
import { Controller, Get, HttpException, HttpStatus, Logger, Query } from '@nestjs/common';
import { CashFlowResponse } from '../../common/types/cash-flow.types';
import { CashFlowService } from './cash-flow.service';

@Controller('cash-flow')
export class CashFlowController {
  private readonly logger = new Logger(CashFlowController.name);

  constructor(private readonly cashFlowService: CashFlowService) {}

  @Get()
  async getCashFlow(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<CashFlowResponse> {
    try {
      if (!startDate || !endDate) {
        throw new HttpException('Start date and end date are required', HttpStatus.BAD_REQUEST);
      }
      return await this.cashFlowService.getCashFlowStatements(startDate, endDate);
    } catch (error) {
    const err = error as any;
      this.logger.error('Error fetching cash flow statements', error);
      throw new HttpException(
        'Error fetching cash flow statements',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}