import { Controller, Get, HttpException, HttpStatus, Query } from '@nestjs/common';
import { AgingService } from './aging.service';

@Controller('aging-report')
export class AgingController {
  constructor(private readonly agingService: AgingService) {}

  @Get()
  async getAgingReport(@Query('asOfDate') asOfDate: string) {
    if (!asOfDate) {
      throw new HttpException('asOfDate is required', HttpStatus.BAD_REQUEST);
    }

    return this.agingService.getAgingReport(asOfDate);
  }
}
