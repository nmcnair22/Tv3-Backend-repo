// src/modules/jobs/jobs.processor.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BillsService } from '../bills/bills.service';
import { JobEntity, JobStatus } from '../bills/entities/job.entity';
import { JobsService } from './jobs.service';

@Injectable()
export class JobsProcessor {
  private readonly logger = new Logger(JobsProcessor.name);
  private readonly CONCURRENCY = 2; // Number of concurrent jobs

  constructor(
    private readonly jobsService: JobsService,
    private readonly billsService: BillsService,
  ) {}

  /**
   * Runs every 5 seconds to process pending jobs.
   */
  @Cron(CronExpression.EVERY_5_SECONDS)
  async handlePendingJobs() {
    this.logger.debug('Checking for pending jobs...');

    for (let i = 0; i < this.CONCURRENCY; i++) {
      const job = await this.jobsService.getNextPendingJob();
      if (job) {
        this.processJob(job);
      }
    }
  }

  /**
   * Processes a single job.
   * @param job - The job entity to process.
   */
  private async processJob(job: JobEntity) {
    this.logger.log(`Processing job ${job.id} of type ${job.type}`);

    try {
      // Update job status to IN_PROGRESS
      await this.jobsService.updateJobStatus(job.id, JobStatus.IN_PROGRESS, '');

      // Process the job based on its type
      if (job.type === 'process_bill') {
        const analysisResult = await this.billsService.processBill(
          job.payload.filePath,
        );

        // Update job status to COMPLETED
        await this.jobsService.updateJobStatus(
          job.id,
          JobStatus.COMPLETED,
          JSON.stringify(analysisResult),
        );
      } else {
        throw new Error(`Unknown job type: ${job.type}`);
      }
    } catch (error: unknown) {
      this.logger.error(`Error processing job ${job.id}:`, error);

      // Update job status to FAILED with error message
      await this.jobsService.updateJobStatus(
        job.id,
        JobStatus.FAILED,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
