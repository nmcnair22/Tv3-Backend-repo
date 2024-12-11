// src/modules/bills/services/archive.service.ts

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

import { ConfigService } from '@nestjs/config';
import { BillGateway } from '../bill.gateway';
import { EventType } from '../entities/event-log.entity';
import { ProcessingInvoice } from '../entities/processing-invoice.entity';
import { TemBill } from '../entities/tem-bill.entity';
import { EventLogService } from './event-log.service';

@Injectable()
export class ArchiveService {
  private readonly logger = new Logger(ArchiveService.name);
  private readonly archiveRootPath: string;
  private readonly auditRootPath: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly billGateway: BillGateway,
    private readonly eventLogService: EventLogService,
  ) {
    this.archiveRootPath = this.configService.get<string>(
      'ARCHIVE_ROOT_PATH',
      path.resolve(process.cwd(), 'Archive'),
    );

    this.auditRootPath = this.configService.get<string>(
      'AUDIT_ROOT_PATH',
      path.resolve(process.cwd(), 'Audit'),
    );

    this.ensureDirectories();
  }

  private ensureDirectories() {
    try {
      fs.mkdirSync(this.archiveRootPath, { recursive: true });
      fs.mkdirSync(this.auditRootPath, { recursive: true });
      this.logger.log(
        `Archive root directory is set at: ${this.archiveRootPath}`,
      );
      this.logger.log(`Audit root directory is set at: ${this.auditRootPath}`);
    } catch (error) {
      this.logger.error('Error creating archive or audit directory:', error);
      throw error;
    }
  }

  /**
   * Archives the bill PDF to the designated folder.
   * @param temBill - The TemBill entity.
   * @param originalFilePath - The original file path of the uploaded PDF.
   * @param jobId - The job ID for logging and emitting updates.
   */
  public async archiveBill(
    temBill: TemBill,
    originalFilePath: string,
    jobId: string,
  ): Promise<string> {
    try {
      // Emit update before archiving starts
      this.billGateway.emitUpdate(jobId, {
        status: 'Processing',
        step: 'Archiving',
        detail: 'Archiving bill PDF...',
      });

      // Log event that archiving is starting
      await this.eventLogService.logEvent(
        jobId,
        EventType.INFO,
        'Starting to archive bill PDF.',
        { temBillId: temBill.id, originalFilePath },
      );

      const customerName = this.sanitizeFileName(temBill.account.customer.name);
      const locationName = temBill.account.location
        ? this.sanitizeFileName(temBill.account.location.name)
        : 'Unknown_Location';
      const carrierName = this.sanitizeFileName(temBill.account.vendor.name);
      const invoiceDate = temBill.invoice_date
        ? new Date(temBill.invoice_date)
        : new Date();
      const yearMonth = `${invoiceDate.getFullYear()}-${(
        invoiceDate.getMonth() + 1
      )
        .toString()
        .padStart(2, '0')}`;

      const archiveDir = path.join(
        this.archiveRootPath,
        customerName,
        locationName,
        carrierName,
        yearMonth,
      );

      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }

      const newFileName = `${temBill.fingerprint}.pdf`;
      const newFilePath = path.join(archiveDir, newFileName);

      fs.renameSync(originalFilePath, newFilePath);

      this.logger.log(`Archived bill to ${newFilePath}`);

      // Emit update after archiving completes
      this.billGateway.emitUpdate(jobId, {
        status: 'Processing',
        step: 'ArchivingCompleted',
        detail: 'Bill archived successfully.',
      });

      // Log event for completed archiving
      await this.eventLogService.logEvent(
        jobId,
        EventType.INFO,
        'Bill archived successfully.',
        { temBillId: temBill.id, archivedPath: newFilePath },
      );

      return newFilePath;
    } catch (error) {
      this.logger.error('Error archiving bill:', error);
      this.billGateway.emitError(
        jobId,
        `Error archiving bill: ${error.message}`,
      );
      await this.eventLogService.logEvent(
        jobId,
        EventType.ERROR,
        'Error encountered during archiving.',
        { error: error.message },
      );
      throw error;
    }
  }

  /**
   * Moves the bill to the audit directory for further review.
   * @param originalFilePath - Path to the file to move.
   * @param invoice - The ProcessingInvoice entity.
   * @param jobId - The job ID for logging and updating.
   */
  public async moveToAudit(
    originalFilePath: string,
    invoice: ProcessingInvoice,
    jobId: string,
  ): Promise<string> {
    try {
      // Emit update before moving to audit
      this.billGateway.emitUpdate(jobId, {
        status: 'Audit',
        step: 'MovingToAudit',
        detail: 'Moving bill to audit folder...',
      });

      // Log event about moving to audit
      await this.eventLogService.logEvent(
        jobId,
        EventType.INFO,
        'Moving bill to audit folder.',
        { invoiceId: invoice.id, originalFilePath },
      );

      const customerName = this.sanitizeFileName(
        invoice.customer_name || 'Unknown_Customer',
      );
      const invoiceDate = invoice.invoice_date
        ? new Date(invoice.invoice_date)
        : new Date();
      const yearMonth = `${invoiceDate.getFullYear()}-${(
        invoiceDate.getMonth() + 1
      )
        .toString()
        .padStart(2, '0')}`;

      const auditDir = path.join(this.auditRootPath, customerName, yearMonth);

      if (!fs.existsSync(auditDir)) {
        fs.mkdirSync(auditDir, { recursive: true });
      }

      const fileName = path.basename(originalFilePath);
      const newFilePath = path.join(auditDir, fileName);

      fs.renameSync(originalFilePath, newFilePath);

      this.logger.log(`Moved bill to audit folder: ${newFilePath}`);

      // Emit update after moving to audit
      this.billGateway.emitUpdate(jobId, {
        status: 'Audit',
        step: 'MovedToAudit',
        detail: 'Bill moved to audit folder successfully.',
      });

      // Log event for completed move to audit
      await this.eventLogService.logEvent(
        jobId,
        EventType.INFO,
        'Bill moved to audit folder successfully.',
        { invoiceId: invoice.id, auditPath: newFilePath },
      );

      return newFilePath;
    } catch (error) {
      this.logger.error('Error moving bill to audit folder:', error);
      this.billGateway.emitError(
        jobId,
        `Error moving bill to audit folder: ${error.message}`,
      );
      await this.eventLogService.logEvent(
        jobId,
        EventType.ERROR,
        'Error encountered while moving bill to audit folder.',
        { error: error.message },
      );
      throw error;
    }
  }

  private sanitizeFileName(name: string): string {
    return name.replace(/[^a-z0-9]/gi, '_');
  }
}
