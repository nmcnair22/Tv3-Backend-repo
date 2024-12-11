import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EventLog, EventType } from '../entities/event-log.entity';

@Injectable()
export class EventLogService {
  constructor(
    @InjectRepository(EventLog)
    private readonly eventLogRepository: Repository<EventLog>,
  ) {}

  /**
   * Logs an event associated with a specific job.
   *
   * @param jobId - The unique ID of the job this event pertains to.
   * @param type - The type of the event (INFO, WARNING, ERROR, etc.).
   * @param message - A descriptive message about the event.
   * @param data - Additional structured data relevant to the event (optional).
   * @param originalFileName - The original filename of the bill if applicable (optional).
   */
  async logEvent(
    jobId: string,
    type: EventType,
    message: string,
    data?: Record<string, any>,
    originalFileName?: string,
  ): Promise<void> {
    // No major functional changes needed, but we ensure that
    // we consistently include jobId, and any other relevant data
    // is passed in the `data` parameter from callers if needed.

    const eventLog = this.eventLogRepository.create({
      jobId,
      type,
      message,
      data,
      originalFileName,
    });

    await this.eventLogRepository.save(eventLog);
  }

  /**
   * Fetches all event logs associated with a given jobId.
   * @param jobId - The job ID to filter events by.
   */
  async getEventsByJobId(jobId: string): Promise<EventLog[]> {
    return this.eventLogRepository.find({
      where: { jobId },
      order: { createdAt: 'ASC' },
    });
  }
}
