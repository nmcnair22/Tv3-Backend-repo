// src/modules/cash-flow/cash-flow.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { CashFlowResponse } from '../../common/types/cash-flow.types';
import { DynamicsReportsService } from '../dynamics/dynamics-reports.service';

@Injectable()
export class CashFlowService {
  private readonly logger = new Logger(CashFlowService.name);

  constructor(private readonly dynamicsReportsService: DynamicsReportsService) {}

  async getCashFlowStatements(
    startDate: string,
    endDate: string,
  ): Promise<CashFlowResponse> {
    try {
      const cashFlowStatements = await this.dynamicsReportsService.getCashFlowStatements(
        startDate,
        endDate,
      );
      return cashFlowStatements;
    } catch (error) {
    const err = error as any;
      this.logger.error('Error fetching cash flow statements', error);
      throw error;
    }
  }
}
