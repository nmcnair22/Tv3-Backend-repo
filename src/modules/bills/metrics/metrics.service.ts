// src/modules/bills/metrics/metrics.service.ts

import { Injectable } from '@nestjs/common';
import { JobsService } from '../../jobs/jobs.service'; // Import JobsService
import { BillsService } from '../bills.service'; // Import BillsService

@Injectable()
export class MetricsService {
  constructor(
    private readonly billsService: BillsService,
    private readonly jobsService: JobsService,
  ) {}

  async getMetrics() {
    // Fetch necessary data from services
    const totalBillsProcessed =
      await this.billsService.getTotalProcessedBills();
    const validationPassRate = await this.billsService.getValidationPassRate();
    const billsInQueue =
      await this.jobsService.countJobsInQueue('process_bill');
    const billsNeedingAudit = await this.billsService.countAuditBills();

    return {
      totalBillsProcessed,
      validationPassRate,
      billsInQueue,
      billsNeedingAudit,
    };
  }
}
