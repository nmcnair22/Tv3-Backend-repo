// src/modules/jobs/jobs.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillsModule } from '../bills/bills.module'; // Import BillsModule if necessary
import { JobEntity } from '../bills/entities/job.entity';
import { JobsProcessor } from './jobs.processor';
import { JobsService } from './jobs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobEntity]),
    BillsModule, // If JobsProcessor needs to access BillsService
  ],
  providers: [JobsService, JobsProcessor],
  exports: [JobsService],
})
export class JobsModule {}
