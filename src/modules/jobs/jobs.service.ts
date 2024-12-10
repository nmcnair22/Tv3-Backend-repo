// src/modules/jobs/jobs.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  JobEntity,
  JobPriority,
  JobStatus,
} from '../bills/entities/job.entity';

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
   * @param priority - (Optional) The priority of the job.
   * @returns The created job entity.
   */
  async enqueueJob(
    type: string,
    payload: Record<string, any>,
    priority: JobPriority = JobPriority.MEDIUM,
  ): Promise<JobEntity> {
    const job = this.jobRepository.create({
      type,
      priority,
      payload,
      status: JobStatus.PENDING,
      attempts: 0,
      max_attempts: 5,
    });

    await this.jobRepository.save(job);
    this.logger.log(
      `Enqueued job ${job.id} of type ${type} with priority ${priority}`,
    );
    return job;
  }

  /**
   * Retrieves the next pending job and marks it as IN_PROGRESS.
   * Uses pessimistic locking to prevent race conditions.
   * @returns The next pending job or null if none are available.
   */
  async getNextPendingJob(): Promise<JobEntity | null> {
    return await this.jobRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const job = await transactionalEntityManager.findOne(JobEntity, {
          where: { status: JobStatus.PENDING },
          order: { createdAt: 'ASC' },
          lock: { mode: 'pessimistic_write' }, // Lock the row for update
        });

        if (job) {
          // Update the job status to IN_PROGRESS within the same transaction
          job.status = JobStatus.IN_PROGRESS;
          await transactionalEntityManager.save(job);
          this.logger.log(`Locked and set job ${job.id} to IN_PROGRESS`);
          return job;
        }

        return null;
      },
    );
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
    result?: string,
  ): Promise<void> {
    await this.jobRepository.update(jobId, { status, result });
    this.logger.log(`Updated job ${jobId} to status ${status}`);
  }

  /**
   * Retrieves all active jobs (IN_PROGRESS).
   * @returns Array of active jobs.
   */
  async getActiveJobs(): Promise<JobEntity[]> {
    return this.jobRepository.find({
      where: { status: JobStatus.IN_PROGRESS },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Retrieves all pending jobs of a given type.
   * @param jobType - The type of the job to retrieve.
   * @returns Array of pending jobs.
   */
  async getPendingJobs(jobType: string): Promise<JobEntity[]> {
    return this.jobRepository.find({
      where: { status: JobStatus.PENDING, type: jobType },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Retrieves all jobs in the queue (PENDING and IN_PROGRESS) of a given type.
   * @param jobType - The type of the job to retrieve.
   * @returns Array of jobs in the queue.
   */
  async getJobsInQueue(jobType: string): Promise<JobEntity[]> {
    return this.jobRepository.find({
      where: {
        type: jobType,
        status: In([JobStatus.PENDING, JobStatus.IN_PROGRESS]),
      },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Retrieves the total count of jobs by status.
   * @param status - The status of jobs to count.
   * @returns The count of jobs with the specified status.
   */
  async getJobCountByStatus(status: JobStatus): Promise<number> {
    return this.jobRepository.count({ where: { status } });
  }

  /**
   * Retrieves job statistics grouped by status.
   * @returns An object containing counts of jobs by status.
   */
  async getJobStatistics(): Promise<Record<JobStatus, number>> {
    const statuses = Object.values(JobStatus);
    const stats: Record<JobStatus, number> = {} as Record<JobStatus, number>;

    for (const status of statuses) {
      stats[status] = await this.getJobCountByStatus(status);
    }

    return stats;
  }

  async countJobsInQueue(jobType: string): Promise<number> {
    const count = await this.jobRepository.count({
      where: {
        type: jobType,
        status: In([JobStatus.PENDING, JobStatus.IN_PROGRESS]),
      },
    });
    return count;
  }
}
