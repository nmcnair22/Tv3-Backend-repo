// src/modules/bills/bills.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsModule } from '../jobs/jobs.module';
import { BillGateway } from './bill.gateway';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';
import { MetricsController } from './metrics/metrics.controller';
import { MetricsService } from './metrics/metrics.service';
import { FolderWatcherService } from './services/folder-watcher.service';

// Entities from the new database (business_central_db)
import { EventLog } from './entities/event-log.entity';
import { Location } from './entities/location.entity';
import { ProcessingInvoiceLineItem } from './entities/processing-invoice-line-item.entity';
import { ProcessingInvoice } from './entities/processing-invoice.entity';
import { TemAccount } from './entities/tem-account.entity';
import { TemBillLineItem } from './entities/tem-bill-line-item.entity';
import { TemBill } from './entities/tem-bill.entity';
import { TemCustomer } from './entities/tem-customer.entity';
import { TemVendor } from './entities/tem-vendor.entity';

// Add new entities
import { Notification } from './entities/notification.entity';
import { ProcessingInvoiceTableCell } from './entities/processing-invoice-table-cell.entity';
import { ProcessingInvoiceTable } from './entities/processing-invoice-table.entity';

// Entities from the old 'tem' database
import { TemMasterView } from './entities/tem-master-view.entity';
import { TemVendorOld } from './entities/tem-vendor-old.entity';

// Entities from the old 'cissdm' database
import { CissdmCustomer } from './entities/cissdm-customer.entity';
import { CissdmLocation } from './entities/cissdm-location.entity';
import { CissdmProvider } from './entities/cissdm-provider.entity';

// Services
import { AnalyzeService } from './services/analyze.service';
import { ArchiveService } from './services/archive.service';
import { BillTypeService } from './services/bill-type.service';
import { EventLogService } from './services/event-log.service';
import { MissingBillsService } from './services/missing-bills.service';
import { RagOpenAiService } from './services/rag-openai.service'; // <-- you already have this
import { RagPineconeService } from './services/rag-pinecone.service'; // <-- Add import
import { RagVisionService } from './services/rag-vision.service';
import { RagService } from './services/rag.service';
import { ValidationService } from './services/validate.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TemAccount,
      TemMasterView,
      TemBill,
      TemBillLineItem,
      TemVendor,
      TemCustomer,
      ProcessingInvoice,
      ProcessingInvoiceLineItem,
      Location,
      EventLog,
      ProcessingInvoiceTable,
      ProcessingInvoiceTableCell,
      Notification,
    ]),
    JobsModule,
    TypeOrmModule.forFeature([TemVendorOld, TemMasterView], 'temConnection'),
    TypeOrmModule.forFeature(
      [CissdmCustomer, CissdmLocation, CissdmProvider],
      'cissdmConnection',
    ),
  ],
  controllers: [BillsController, MetricsController],
  providers: [
    BillsService,
    AnalyzeService,
    BillTypeService,
    ValidationService,
    ArchiveService,
    BillGateway,
    FolderWatcherService,
    EventLogService,
    MetricsService,
    MissingBillsService,

    RagService, // RAG pipeline
    RagVisionService, // Vision-based RAG
    RagOpenAiService, // provides embeddings / completions
    RagPineconeService, // <-- ADD THIS so Nest can inject it into RagService
  ],
  exports: [BillsService, MissingBillsService, RagService],
})
export class BillsModule {}
