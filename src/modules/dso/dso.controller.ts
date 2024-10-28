// src/modules/dso/dso.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { DsoService } from './dso.service';

@Controller('dso')
export class DsoController {
  constructor(private readonly dsoService: DsoService) {}

  @Get('company-wide')
  async getCompanyWideDSO(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<{ dso: number }> {
    return this.dsoService.getCompanyWideDSO(startDate, endDate);
  }

  @Get('per-customer')
  async getPerCustomerDSO(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<{ customerName: string; averageDSO: number }[]> {
    return this.dsoService.getPerCustomerDSO(startDate, endDate);
  }
}
