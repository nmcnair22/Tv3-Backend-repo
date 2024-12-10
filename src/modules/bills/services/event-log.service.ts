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

  async logEvent(
    jobId: string,
    type: EventType,
    message: string,
    data?: Record<string, any>,
    originalFileName?: string,
  ): Promise<void> {
    const eventLog = this.eventLogRepository.create({
      jobId,
      type,
      message,
      data,
      originalFileName,
    });
    await this.eventLogRepository.save(eventLog);
  }
}
