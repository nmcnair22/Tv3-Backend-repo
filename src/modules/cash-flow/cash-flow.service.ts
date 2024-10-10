// src/modules/cash-flow/cash-flow.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { CashFlowResponse } from '../../common/types/cash-flow.types';
import { DynamicsService } from '../dynamics/dynamics.service';

@Injectable()
export class CashFlowService {
  private readonly logger = new Logger(CashFlowService.name);

  constructor(private readonly dynamicsService: DynamicsService) {}

  async getCashFlowStatements(
    startDate: string,
    endDate: string,
  ): Promise<CashFlowResponse> {
    try {
      const cashFlowStatements = await this.dynamicsService.getCashFlowStatements(
        startDate,
        endDate,
      );
      // You can process cashFlowStatements here if needed
      return cashFlowStatements;
    } catch (error) {
      this.logger.error('Error fetching cash flow statements', error);
      throw error;
    }
  }
}