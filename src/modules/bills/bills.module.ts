// src/modules/bills/bills.module.ts

import { BadRequestException, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as multer from 'multer';
import * as path from 'path';

import { BillGateway } from './bill.gateway';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';
import { AzureBill } from './entities/azure-bill.entity';
import { AzureInvoiceItem } from './entities/azure-invoice-item.entity';
import { AnalyzeService } from './services/analyze.service';
import { ArchiveService } from './services/archive.service';
import { JobQueueService } from './services/job-queue.service';
import { MLBBillFormatService } from './services/mlb-bill-format.service';
import { ValidateService } from './services/validate.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([AzureBill, AzureInvoiceItem]),
    MulterModule.register({
      storage: multer.diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only PDF files are allowed!'), false);
        }
      },
    }),
    // Removed BullModule and BullBoardModule since Redis is not used
  ],
  controllers: [BillsController],
  providers: [
    BillsService,
    AnalyzeService,
    ValidateService,
    MLBBillFormatService,
    ArchiveService,
    BillGateway,
    JobQueueService, // Ensure JobQueueService is adapted to not use Bull
  ],
})
export class BillsModule {}
