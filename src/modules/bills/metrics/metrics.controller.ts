// src/modules/bills/metrics/metrics.controller.ts

import { Controller, Get } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('api/bills/metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  async getMetrics() {
    return await this.metricsService.getMetrics();
  }
}
