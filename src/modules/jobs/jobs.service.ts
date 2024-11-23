// src/modules/jobs/jobs.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobEntity, JobStatus } from '../bills/entities/job.entity';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectRepository(JobEntity)
    private readonly jobRepository: Repository<JobEntity>,
  ) {}

  /**
   * Enqueues a new job.
   * @param type - The type of the job.
   * @param payload - The data required to process the job.
   * @returns The created job entity.
   */
  async enqueueJob(
    type: string,
    payload: Record<string, any>,
  ): Promise<JobEntity> {
    const job = this.jobRepository.create({
      type,
      payload,
      status: JobStatus.PENDING,
    });

    await this.jobRepository.save(job);
    this.logger.log(`Enqueued job ${job.id} of type ${type}`);

    return job;
  }

  /**
   * Retrieves the next pending job.
   * @returns The next pending job or null if none are available.
   */
  async getNextPendingJob(): Promise<JobEntity | null> {
    const job = await this.jobRepository.findOne({
      where: { status: JobStatus.PENDING },
      order: { createdAt: 'ASC' },
    });

    return job || null;
  }

  /**
   * Updates the status and result of a job.
   * @param jobId - The ID of the job to update.
   * @param status - The new status of the job.
   * @param result - The result or error message.
   */
  async updateJobStatus(
    jobId: string,
    status: JobStatus,
    result: string,
  ): Promise<void> {
    await this.jobRepository.update(jobId, { status, result });
    this.logger.log(`Updated job ${jobId} to status ${status}`);
  }

  /**
   * Retrieves all active jobs.
   * @returns Array of active jobs.
   */
  async getActiveJobs(): Promise<JobEntity[]> {
    return this.jobRepository.find({
      where: { status: JobStatus.PENDING },
      order: { createdAt: 'ASC' },
    });
  }
}
