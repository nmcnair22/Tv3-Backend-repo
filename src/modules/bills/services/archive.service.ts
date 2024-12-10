// src/modules/bills/services/archive.service.ts

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

// Import ConfigService if using @nestjs/config
import { ConfigService } from '@nestjs/config';
import { ProcessingInvoice } from '../entities/processing-invoice.entity';
import { TemBill } from '../entities/tem-bill.entity';

@Injectable()
export class ArchiveService {
  private readonly logger = new Logger(ArchiveService.name);
  private readonly archiveRootPath: string;
  private readonly auditRootPath: string;

  constructor(
    private readonly configService: ConfigService, // Inject ConfigService
  ) {
    // Load paths from environment variables or use default values
    this.archiveRootPath = this.configService.get<string>(
      'ARCHIVE_ROOT_PATH',
      path.resolve(process.cwd(), 'Archive'), // Updated default value
    );

    this.auditRootPath = this.configService.get<string>(
      'AUDIT_ROOT_PATH',
      path.resolve(process.cwd(), 'Audit'), // Updated default value
    );

    this.ensureDirectories();
  }

  /**
   * Ensures that the archive and audit directories exist.
   */
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
   */
  public async archiveBill(
    temBill: TemBill,
    originalFilePath: string,
  ): Promise<string> {
    try {
      // Build the archive directory path
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

      return newFilePath;
    } catch (error) {
      this.logger.error('Error archiving bill:', error);
      throw error;
    }
  }

  /**
   * Moves the bill to the audit directory for further review.
   * @param originalFilePath - Path to the file to archive.
   * @param invoice - The ProcessingInvoice entity.
   */
  public async moveToAudit(
    originalFilePath: string,
    invoice: ProcessingInvoice,
  ): Promise<string> {
    try {
      // Build the audit directory path
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

      return newFilePath;
    } catch (error) {
      this.logger.error('Error moving bill to audit folder:', error);
      throw error;
    }
  }

  /**
   * Sanitizes a file or directory name by removing or replacing illegal characters.
   * @param name - The original name to sanitize.
   * @returns A sanitized file or directory name.
   */
  private sanitizeFileName(name: string): string {
    return name.replace(/[^a-z0-9]/gi, '_');
  }
}
