// src/modules/income-statements/income-statements.service.ts

import { Injectable } from '@nestjs/common';
import { IncomeStatementsResponse } from '../../common/types/income-statements.types';
import { DynamicsReportsService } from '../dynamics/dynamics-reports.service';

@Injectable()
export class IncomeStatementsService {
  constructor(private readonly dynamicsReportsService: DynamicsReportsService) {}

  async getIncomeStatements(
    startDate: string,
    endDate: string,
  ): Promise<IncomeStatementsResponse> {
    return this.dynamicsReportsService.getIncomeStatements(startDate, endDate);
  }
}
