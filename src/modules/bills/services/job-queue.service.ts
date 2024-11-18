// src/modules/bills/services/job-queue.service.ts

import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import { Worker } from 'worker_threads';
import { BillGateway } from '../bill.gateway';

interface Job {
  id: string;
  filePath: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0 to 100
  error?: string;
}

@Injectable()
export class JobQueueService {
  private queue: Job[] = [];
  private activeJobs: number = 0;
  private readonly maxConcurrentJobs = 2; // Adjust based on your server's capability
  private readonly logger = new Logger(JobQueueService.name);

  constructor(private readonly billGateway: BillGateway) {}

  /**
   * Adds a new job to the queue.
   * @param filePath The path of the file to process.
   * @returns The created job.
   */
  addJob(filePath: string): Job {
    const job: Job = {
      id: `${Date.now()}-${Math.random()}`,
      filePath,
      status: 'pending',
      progress: 0,
    };
    this.queue.push(job);
    this.logger.log(`Job added: ${job.id}`);
    this.processQueue();
    return job;
  }

  /**
   * Retrieves all jobs.
   * @returns An array of jobs.
   */
  getJobs(): Job[] {
    return this.queue;
  }

  /**
   * Processes jobs in the queue based on concurrency limits.
   */
  private async processQueue() {
    while (
      this.activeJobs < this.maxConcurrentJobs &&
      this.queue.some((j) => j.status === 'pending')
    ) {
      const job = this.queue.find((j) => j.status === 'pending');
      if (job) {
        this.activeJobs++;
        job.status = 'processing';
        this.billGateway.emitUpdate(job.id, {
          status: 'processing',
          progress: job.progress,
        });

        this.logger.log(`Processing job: ${job.id}`);

        // Resolve the absolute path to the worker file
        const workerPath = path.resolve(__dirname, '../../workers/bill.worker.js');

        const worker = new Worker(workerPath, {
          workerData: { filePath: job.filePath },
        });

        worker.on('message', (msg) => {
          if (msg.status === 'completed') {
            job.status = 'completed';
            job.progress = 100;
            this.billGateway.emitUpdate(job.id, {
              status: 'completed',
              progress: job.progress,
              result: msg.result,
            });
            this.logger.log(`Job completed: ${job.id}`);
          } else if (msg.status === 'failed') {
            job.status = 'failed';
            job.error = msg.error;
            this.billGateway.emitError(job.id, msg.error);
            this.logger.error(`Job failed: ${job.id}, Error: ${msg.error}`);
          }
        });

        worker.on('error', (error) => {
          job.status = 'failed';
          job.error = error.message;
          this.billGateway.emitError(job.id, error.message);
          this.logger.error(`Worker error for job ${job.id}:`, error);
        });

        worker.on('exit', (code) => {
          if (code !== 0) {
            this.logger.error(`Worker stopped with exit code ${code} for job ${job.id}`);
          }
          this.activeJobs--;
          this.processQueue();
        });
      }
    }
  }
}
