// src/modules/bills/bills.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Import entities and services
import { BillGateway } from './bill.gateway';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';
import { AnalyzeService } from './services/analyze.service';
import { ArchiveService } from './services/archive.service';
import { BillTypeService } from './services/bill-type.service';
import { ValidationService } from './services/validate.service';

// Entities
import { AzureBill } from './entities/azure-bill.entity';
import { ProcessingInvoiceLineItem } from './entities/processing-invoice-line-item.entity';
import { ProcessingInvoice } from './entities/processing-invoice.entity';
import { TemMasterViewUpdated } from './entities/tem-master-view-updated.entity';

// Import JobsModule
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [AzureBill, ProcessingInvoice, ProcessingInvoiceLineItem],
      'default',
    ),
    TypeOrmModule.forFeature([TemMasterViewUpdated], 'temConnection'),
    forwardRef(() => JobsModule), // Use forwardRef here
  ],
  controllers: [BillsController],
  providers: [
    BillsService,
    BillGateway,
    AnalyzeService,
    ArchiveService,
    ValidationService,
    BillTypeService,
    // Remove PipelineService if it's undefined or not used
    // Any other providers
  ],
  exports: [BillsService],
})
export class BillsModule {}
