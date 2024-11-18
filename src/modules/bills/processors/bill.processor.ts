// src/modules/bills/processors/bill.processor.ts

import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { BillGateway } from '../bill.gateway';
import { BillsService } from '../bills.service';

@Processor('bill-processing')
export class BillProcessor {
  private readonly logger = new Logger(BillProcessor.name);

  constructor(
    private readonly billsService: BillsService,
    private readonly billGateway: BillGateway, // Inject BillGateway
  ) {}

  @Process()
  async handleBillProcessing(job: Job<{ filePath: string }>) {
    const { filePath } = job.data;

    try {
      this.logger.log(`Processing bill: ${filePath} (Job ID: ${job.id})`);

      // Emit start of processing
      this.billGateway.emitUpdate(
        job.id.toString(),
        { status: 'started', filePath, jobId: job.id },
      );

      // Process the bill
      const analysisResult = await this.billsService.analyzeBill(filePath);

      // Emit completion of processing
      this.billGateway.emitUpdate(
        job.id.toString(),
        { status: 'completed', analysisResult },
      );

      return analysisResult;
    } catch (error: unknown) {
      this.logger.error(`Error processing bill ${filePath}:`, error as Error);

      // Emit error to frontend
      this.billGateway.emitError(
        job.id.toString(),
        (error as Error).message,
      );

      throw error;
    }
  }
}
