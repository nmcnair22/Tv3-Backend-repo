// src/modules/income-statements/income-statements.controller.ts
import { Controller, Get, HttpException, HttpStatus, Query } from '@nestjs/common';
import { IncomeStatementsService } from './income-statements.service';

@Controller('income-statements')
export class IncomeStatementsController {
  constructor(private readonly incomeStatementsService: IncomeStatementsService) {}

  @Get()
  async getIncomeStatements(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    try {
      return await this.incomeStatementsService.getIncomeStatements(startDate, endDate);
    } catch (error) {
      throw new HttpException('Error fetching income statements', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}