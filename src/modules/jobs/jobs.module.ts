// src/modules/jobs/jobs.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobEntity } from '../bills/entities/job.entity';
import { JobsProcessor } from './jobs.processor';
import { JobsService } from './jobs.service';

// Import BillsModule
import { BillsModule } from '../bills/bills.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobEntity]),
    forwardRef(() => BillsModule), // Use forwardRef here
  ],
  providers: [JobsProcessor, JobsService],
  exports: [JobsService],
})
export class JobsModule {}
