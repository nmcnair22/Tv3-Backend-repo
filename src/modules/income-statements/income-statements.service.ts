// src/modules/income-statements/income-statements.service.ts
import { Injectable } from '@nestjs/common';
import { DynamicsService } from '../dynamics/dynamics.service';

@Injectable()
export class IncomeStatementsService {
  constructor(private readonly dynamicsService: DynamicsService) {}

  async getIncomeStatements(startDate: string, endDate: string) {
    // Implement logic to fetch and process income statements
    return this.dynamicsService.getIncomeStatements(startDate, endDate);
  }
}