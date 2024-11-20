// src/modules/bills/bills.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsModule } from '../jobs/jobs.module';
import { BillGateway } from './bill.gateway';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';
import { AzureBill } from './entities/azure-bill.entity';
import { BillProcessor } from './processors/bill.processor';
import { AnalyzeService } from './services/analyze.service';
import { ArchiveService } from './services/archive.service';
import { ValidateService } from './services/validate.service';

// Import the new entities
import { ProcessingInvoiceLineItem } from './entities/processing-invoice-line-item.entity';
import { ProcessingInvoice } from './entities/processing-invoice.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AzureBill,
      ProcessingInvoice,
      ProcessingInvoiceLineItem,
    ]),
    JobsModule,
    // ... other imports if necessary
  ],
  controllers: [BillsController],
  providers: [
    BillsService,
    BillProcessor,
    AnalyzeService,
    ValidateService,
    ArchiveService,
    BillGateway,
  ],
  exports: [BillsService],
})
export class BillsModule {}
