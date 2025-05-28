// src/modules/bills/bills.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import pLimit from 'p-limit';
import * as path from 'path';
import { MoreThan, Repository } from 'typeorm';

import { JobsService } from '../jobs/jobs.service';
import { BillGateway } from './bill.gateway';
import { AnalyzeService } from './services/analyze.service';
import { ArchiveService } from './services/archive.service';
import { BillTypeService } from './services/bill-type.service';
import { ValidationService } from './services/validate.service';

// Entities
import { JobEntity } from './entities/job.entity';
import { Location } from './entities/location.entity';
import { ProcessingInvoiceLineItem } from './entities/processing-invoice-line-item.entity';
import { ProcessingInvoice } from './entities/processing-invoice.entity';
import { TemAccount } from './entities/tem-account.entity';
import { TemBillLineItem } from './entities/tem-bill-line-item.entity';
import { TemBill } from './entities/tem-bill.entity';
import { TemCustomer } from './entities/tem-customer.entity';
import { TemVendor } from './entities/tem-vendor.entity';
// Entities from the old 'tem' database
import { TemMasterView } from './entities/tem-master-view.entity';
import { TemVendorOld } from './entities/tem-vendor-old.entity';
// Entities from the old 'cissdm' database
import { CissdmCustomer } from './entities/cissdm-customer.entity';
import { CissdmLocation } from './entities/cissdm-location.entity';
import { CissdmProvider } from './entities/cissdm-provider.entity';

// Import the shared ValidationResult interface
import { ValidationResult } from './interfaces/validation-result.interface';

// Import EventLogService and EventType
import { EventType } from './entities/event-log.entity';
import { EventLogService } from './services/event-log.service';

@Injectable()
export class BillsService {
  private readonly logger = new Logger(BillsService.name);

  constructor(
    private readonly analyzeService: AnalyzeService,
    private readonly billTypeService: BillTypeService,
    private readonly validationService: ValidationService,
    private readonly archiveService: ArchiveService,
    private readonly jobsService: JobsService,

    @InjectRepository(ProcessingInvoice)
    private readonly invoiceRepository: Repository<ProcessingInvoice>,

    @InjectRepository(ProcessingInvoiceLineItem)
    private readonly lineItemRepository: Repository<ProcessingInvoiceLineItem>,

    @InjectRepository(TemAccount)
    private readonly temAccountRepository: Repository<TemAccount>,

    @InjectRepository(TemBill)
    private readonly temBillRepository: Repository<TemBill>,

    @InjectRepository(TemBillLineItem)
    private readonly temBillLineItemRepository: Repository<TemBillLineItem>,

    @InjectRepository(TemVendor)
    private readonly temVendorRepository: Repository<TemVendor>,

    @InjectRepository(TemCustomer)
    private readonly temCustomerRepository: Repository<TemCustomer>,

    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,

    @InjectRepository(TemVendorOld, 'temConnection')
    private readonly temVendorOldRepository: Repository<TemVendorOld>,

    @InjectRepository(TemMasterView, 'temConnection')
    private readonly temMasterViewRepository: Repository<TemMasterView>,

    @InjectRepository(CissdmCustomer, 'cissdmConnection')
    private readonly cissdmCustomerRepository: Repository<CissdmCustomer>,

    @InjectRepository(CissdmLocation, 'cissdmConnection')
    private readonly cissdmLocationRepository: Repository<CissdmLocation>,

    @InjectRepository(CissdmProvider, 'cissdmConnection')
    private readonly cissdmProviderRepository: Repository<CissdmProvider>,

    private readonly billGateway: BillGateway,
    private readonly eventLogService: EventLogService,
  ) {}

  async processAllBillsInFolder(folderPath: string): Promise<any[]> {
    if (!folderPath) {
      this.logger.warn('No folder path provided.');
      throw new Error('No folder path provided');
    }

    if (!fs.existsSync(folderPath)) {
      this.logger.error(`Folder not found: ${folderPath}`);
      throw new Error(`Folder not found: ${folderPath}`);
    }

    try {
      this.logger.log(
        `Starting concurrent bill processing for folder: ${folderPath}`,
      );

      const files = fs.readdirSync(folderPath);
      const pdfFiles = files.filter((file) =>
        file.toLowerCase().endsWith('.pdf'),
      );

      if (pdfFiles.length === 0) {
        this.logger.warn('No PDF files found in the folder.');
        return [];
      }

      const limit = pLimit(10);
      const processingPromises = pdfFiles.map((file) =>
        limit(() => this.processFile(path.join(folderPath, file))),
      );

      const processingResults = await Promise.all(processingPromises);

      this.logger.log('Completed concurrent bill processing.');

      return processingResults;
    } catch (error) {
      this.logger.error('Error during bulk bill processing:', error);
      throw error;
    }
  }

  private async processFile(filePath: string): Promise<any> {
    const fileName = path.basename(filePath);
    const fileSizeInBytes = fs.existsSync(filePath)
      ? fs.statSync(filePath).size
      : 0;

    this.logger.log(`Processing file: ${fileName}`);
    this.logger.log(`File path: ${filePath}`);
    this.logger.log(`File size: ${fileSizeInBytes} bytes`);

    if (!fs.existsSync(filePath)) {
      this.logger.error(`File not found: ${filePath}`);
      return { file: fileName, error: 'File not found or inaccessible' };
    }

    if (fileSizeInBytes === 0) {
      this.logger.error(`File is empty: ${filePath}`);
      return { file: fileName, error: 'File is empty' };
    }

    try {
      const result = await this.processBill(filePath);
      return { file: fileName, result };
    } catch (error) {
      this.logger.error(`Error processing file ${fileName}:`, error);
      return { file: fileName, error: error.message };
    }
  }

  async processBill(filePath: string, jobId?: string): Promise<any> {
    if (!filePath) {
      this.logger.warn('No file path provided.');
      throw new Error('No file path provided');
    }

    if (!fs.existsSync(filePath)) {
      this.logger.error(`File not found: ${filePath}`);
      throw new Error(`File not found: ${filePath}`);
    }

    const fileSizeInBytes = fs.statSync(filePath).size;

    if (fileSizeInBytes === 0) {
      this.logger.error(`File is empty: ${filePath}`);
      throw new Error(`File is empty: ${filePath}`);
    }

    if (!jobId) {
      jobId = path.basename(filePath);
    }

    const originalFileName = path.basename(filePath);

    this.logger.log(
      `Starting bill processing for file: ${filePath}, Job ID: ${jobId}`,
    );
    this.logger.log(`File size: ${fileSizeInBytes} bytes`);

    let savedInvoice: ProcessingInvoice | null = null;

    try {
      this.billGateway.emitUpdate(jobId, {
        status: 'Processing',
        step: 'Started',
      });

      await this.eventLogService.logEvent(
        jobId,
        EventType.INFO,
        `Started processing bill from file: ${originalFileName}`,
        null,
        originalFileName,
      );

      // Analysis Phase
      savedInvoice = await this.analyzeService.analyzeWithAzure(
        filePath,
        jobId,
      );
      if (!savedInvoice) {
        throw new Error('Saved invoice not found after analysis');
      }
      savedInvoice = await this.invoiceRepository.findOne({
        where: { id: savedInvoice.id },
        relations: ['line_items'],
      });

      this.logger.log(
        `Fetched savedInvoice with ID: ${savedInvoice.id}, Job ID: ${jobId}`,
      );

      this.billGateway.emitUpdate(jobId, {
        status: 'Processing',
        step: 'AnalysisCompleted',
      });

      // Determine Bill Type
      // Emit an update before determining bill type
      this.billGateway.emitUpdate(jobId, {
        status: 'Processing',
        step: 'DeterminingBillType',
        detail: 'Analyzing extracted data to determine bill type...',
      });

      await this.billTypeService.determineBillType(savedInvoice, jobId);

      this.logger.log(
        `Determined bill type for invoice ${savedInvoice.id}: ${savedInvoice.bill_type}`,
      );

      this.billGateway.emitUpdate(jobId, {
        status: 'Processing',
        step: 'BillTypeDetermined',
        billType: savedInvoice.bill_type,
      });

      // Fetch TEM record
      this.billGateway.emitUpdate(jobId, {
        status: 'Processing',
        step: 'FetchingTEMRecord',
        detail: 'Fetching TEM record based on determined bill type...',
      });

      const temRecord = await this.billTypeService.getTemRecord(savedInvoice);
      if (!temRecord) {
        this.logger.error(
          `TEM record not found for invoice ID: ${savedInvoice.id}, Customer ID: ${savedInvoice.customer_id}`,
        );
        throw new Error(
          `TEM record not found for Customer ID ${savedInvoice.customer_id}. Unable to proceed with processing.`,
        );
      }

      if (savedInvoice.audit_flag) {
        this.logger.warn(`Invoice ${savedInvoice.id} flagged for audit.`);

        this.billGateway.emitUpdate(jobId, {
          status: 'Audit',
          step: 'FlaggedForAudit',
          detail: 'Bill flagged for audit after bill type determination.',
        });

        const newFilePath = await this.archiveService.moveToAudit(
          filePath,
          savedInvoice,
          jobId, // Added jobId
        );

        savedInvoice.status = 'Audit';
        savedInvoice.archived_file_path = newFilePath;
        await this.invoiceRepository.save(savedInvoice);

        await this.eventLogService.logEvent(
          jobId,
          EventType.WARNING,
          `Invoice ${savedInvoice.id} flagged for audit.`,
          null,
          originalFileName,
        );

        return {
          message: 'Invoice flagged for audit',
          invoiceId: savedInvoice.id,
          status: 'Audit',
        };
      }

      if (savedInvoice.bill_type === 'SLB') {
        // Before Validation
        this.billGateway.emitUpdate(jobId, {
          status: 'Processing',
          step: 'PreparingValidation',
          detail: 'Preparing to validate the invoice data...',
        });

        savedInvoice = await this.invoiceRepository.findOne({
          where: { id: savedInvoice.id },
          relations: {
            line_items: true,
            tables: {
              cells: true,
            },
          },
        });

        const validationResult = await this.validateInvoice(
          savedInvoice,
          jobId,
        );

        // Before Finalization
        this.billGateway.emitUpdate(jobId, {
          status: 'Processing',
          step: 'PreparingFinalization',
          detail: 'Validation done, proceeding to finalization...',
        });

        const isFinalized = await this.finalizeInvoice(
          savedInvoice,
          validationResult,
          filePath,
          temRecord,
          jobId, // Added jobId
        );

        let message = 'Bill processing completed';
        if (!isFinalized) {
          message = 'Duplicate bill detected, bill not processed';
        }

        this.billGateway.emitUpdate(jobId, {
          status: isFinalized ? 'Completed' : 'Duplicate',
          step: isFinalized ? 'ProcessingCompleted' : 'DuplicateDetected',
        });

        await this.eventLogService.logEvent(
          jobId,
          EventType.INFO,
          isFinalized
            ? `Invoice ${savedInvoice.id} processed successfully.`
            : `Duplicate invoice ${savedInvoice.id} detected, processing skipped.`,
          null,
          originalFileName,
        );
        return {
          message: message,
          invoiceId: savedInvoice.id,
          status: savedInvoice.validation_status || 'Processed',
          duplicate: !isFinalized,
        };
      } else if (savedInvoice.bill_type === 'MLB') {
        this.logger.warn(
          `Invoice ${savedInvoice.id} is MLB and will be processed later.`,
        );

        this.billGateway.emitUpdate(jobId, {
          status: 'MLB Pending',
          step: 'MLBProcessingPending',
          detail: 'MLB detected, moving to audit for future processing...',
        });

        const newFilePath = await this.archiveService.moveToAudit(
          filePath,
          savedInvoice,
          jobId, // Added jobId
        );

        savedInvoice.status = 'MLB Pending';
        savedInvoice.archived_file_path = newFilePath;
        await this.invoiceRepository.save(savedInvoice);

        await this.eventLogService.logEvent(
          jobId,
          EventType.INFO,
          `Invoice ${savedInvoice.id} is MLB and will be processed later.`,
          null,
          originalFileName,
        );

        return {
          message: 'MLB processing not implemented yet',
          invoiceId: savedInvoice.id,
          status: 'MLB Pending',
        };
      }

      // If reached here, processing complete
      this.billGateway.emitUpdate(jobId, {
        status: 'Completed',
        step: 'ProcessingCompleted',
      });

      await this.eventLogService.logEvent(
        jobId,
        EventType.INFO,
        `Invoice ${savedInvoice.id} processing completed.`,
        null,
        originalFileName,
      );

      return {
        message: 'Bill processing completed',
        invoiceId: savedInvoice.id,
        status: savedInvoice.validation_status || 'Processed',
      };
    } catch (error) {
      this.billGateway.emitError(jobId, error.message);
      this.logger.error(
        `Error during bill processing (Job ID: ${jobId}):`,
        error,
      );

      await this.eventLogService.logEvent(
        jobId,
        EventType.ERROR,
        `Error processing bill: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        {
          stack: error instanceof Error ? error.stack : undefined,
        },
        originalFileName,
      );

      if (savedInvoice) {
        const newFilePath = await this.archiveService.moveToAudit(
          filePath,
          savedInvoice,
          jobId, // Added jobId
        );

        savedInvoice.status = 'Error';
        savedInvoice.error_message =
          error instanceof Error ? error.message : 'Unknown error';
        savedInvoice.archived_file_path = newFilePath;
        await this.invoiceRepository.save(savedInvoice);
      } else {
        await this.archiveService.moveToAudit(
          filePath,
          {
            customer_name: 'Unknown_Customer',
            invoice_date: new Date(),
          } as ProcessingInvoice,
          jobId /* Added jobId */,
        );
      }

      throw error;
    }
  }

  // Added jobId to signature
  private async validateInvoice(
    invoice: ProcessingInvoice,
    jobId: string,
  ): Promise<ValidationResult> {
    this.logger.log(`Validating invoice ${invoice.id}, Job ID: ${jobId}`);

    try {
      this.billGateway.emitUpdate(jobId, {
        status: 'Validating',
        step: 'ValidationStarted',
      });

      const validationResult = await this.validationService.validateInvoice(
        invoice,
        jobId,
      ); // pass jobId here once validationService is updated

      this.logger.debug(
        `ValidationResult for invoice ${invoice.id}:`,
        validationResult,
      );

      invoice.validation_status = validationResult.status || 'Unknown';
      invoice.validation_level = validationResult.level || 0;
      invoice.validation_errors = validationResult.errors || null;

      this.logger.log(
        `Invoice ${invoice.id} validation status: ${invoice.validation_status}, Level: ${invoice.validation_level}`,
      );

      if (validationResult.status === 'Fail') {
        invoice.audit_flag = true;
        this.logger.warn(
          `Invoice ${invoice.id} failed validation and is flagged for audit.`,
        );
        this.billGateway.emitUpdate(jobId, {
          status: 'ValidationFailed',
          step: 'ValidationFailed',
          errors: validationResult.errors,
        });
      } else {
        invoice.audit_flag = false;
        this.logger.log(
          `Invoice ${invoice.id} passed validation with level ${invoice.validation_level}`,
        );
        this.billGateway.emitUpdate(jobId, {
          status: 'ValidationPassed',
          step: 'ValidationPassed',
          level: validationResult.level,
        });
      }

      await this.invoiceRepository.save(invoice);

      if (validationResult.LineItems && validationResult.LineItems.length > 0) {
        for (const itemData of validationResult.LineItems) {
          const lineItem = invoice.line_items.find(
            (item: ProcessingInvoiceLineItem) =>
              item.description === itemData.Description &&
              parseFloat(item.amount.toString()) === itemData.Amount,
          );
          if (lineItem) {
            lineItem.category = itemData.Category || null;
            lineItem.subcategory = itemData.SubCategory || null;
            await this.lineItemRepository.save(lineItem);
            this.logger.log(
              `Updated line item ${lineItem.id} with category ${lineItem.category} and subcategory ${lineItem.subcategory}`,
            );
          }
        }
      }

      return validationResult;
    } catch (error) {
      this.logger.error(`Validation error for invoice ${invoice.id}:`, error);
      this.billGateway.emitError(jobId, `Validation error: ${error.message}`);
      throw error;
    }
  }

  // Added jobId to signature
  private async finalizeInvoice(
    invoice: ProcessingInvoice,
    validationResult: ValidationResult,
    filePath: string,
    temRecord: TemMasterView,
    jobId: string,
  ): Promise<boolean> {
    try {
      this.logger.log(`Finalizing invoice ${invoice.id}`);

      this.billGateway.emitUpdate(jobId, {
        status: 'Processing',
        step: 'Finalization',
        detail: 'Enriching data and moving invoice to permanent storage...',
      });

      const vendor = await this.findOrCreateVendor(
        validationResult.ProcessedData,
        temRecord,
      );
      this.billGateway.emitUpdate(jobId, {
        status: 'Processing',
        step: 'Finalization',
        detail: 'Vendor found/created, now handling customer...',
      });

      const customer = await this.findOrCreateCustomer(
        validationResult.ProcessedData,
        temRecord,
      );
      this.billGateway.emitUpdate(jobId, {
        status: 'Processing',
        step: 'Finalization',
        detail: 'Customer found/created, now handling location...',
      });

      const location = await this.findOrCreateLocation(
        validationResult.ProcessedData,
        customer,
        temRecord,
      );
      this.billGateway.emitUpdate(jobId, {
        status: 'Processing',
        step: 'Finalization',
        detail: 'Location found/created, now handling account...',
      });

      const account = await this.findOrCreateAccount(
        validationResult.ProcessedData,
        vendor,
        customer,
        location,
        invoice,
        temRecord,
      );

      this.billGateway.emitUpdate(jobId, {
        status: 'Processing',
        step: 'Finalization',
        detail: 'Creating TemBill and line items...',
      });

      const temBill = new TemBill();
      temBill.account = account;
      temBill.account_id = account.id;
      temBill.invoice_id = invoice.invoice_id;
      temBill.invoice_date = invoice.invoice_date?.toString() || null;
      temBill.due_date = invoice.due_date?.toString() || null;
      temBill.amount_due = invoice.amount_due;
      temBill.invoice_total = invoice.invoice_total;
      temBill.previous_unpaid_balance = invoice.previous_unpaid_balance;
      temBill.validation_status = invoice.validation_status;
      temBill.validation_level = invoice.validation_level;
      temBill.validation_errors = invoice.validation_errors;
      temBill.bill_type = invoice.bill_type;
      temBill.audit_flag = invoice.audit_flag;
      temBill.status = 'Processed';
      temBill.notes = validationResult.ValidationResult?.Notes;
      temBill.archived_file_path = null;
      temBill.fingerprint = this.generateFingerprint(invoice, account);

      const existingBill = await this.temBillRepository.findOne({
        where: { fingerprint: temBill.fingerprint },
      });

      if (existingBill) {
        this.logger.warn(
          `Duplicate bill detected for fingerprint ${temBill.fingerprint}. Skipping save.`,
        );
        this.billGateway.emitUpdate(jobId, {
          status: 'Duplicate',
          step: 'DuplicateDetected',
          detail: 'Duplicate bill detected, finalization skipped.',
        });
        return false;
      }

      const temBillLineItems: TemBillLineItem[] = [];
      if (validationResult.LineItems && validationResult.LineItems.length > 0) {
        for (const lineItemData of validationResult.LineItems) {
          const temLineItem = new TemBillLineItem();
          temLineItem.description = lineItemData.Description;
          temLineItem.amount = lineItemData.Amount;
          temLineItem.category = lineItemData.Category || null;
          temLineItem.subcategory = lineItemData.SubCategory || null;

          // Assign the IncludeInTotal field from the assistant's response
          temLineItem.include_in_total = lineItemData.IncludeInTotal === true;

          temLineItem.bill = temBill;
          temBillLineItems.push(temLineItem);
        }
      }

      temBill.line_items = temBillLineItems;
      await this.temBillRepository.save(temBill);

      this.logger.log(
        `Invoice ${invoice.id} finalized and saved to tem_bills.`,
      );

      this.billGateway.emitUpdate(jobId, {
        status: 'Processing',
        step: 'Finalization',
        detail: 'Archiving bill PDF...',
      });

      const newFilePath = await this.archiveService.archiveBill(
        temBill,
        filePath,
        jobId,
      );

      temBill.archived_file_path = newFilePath;
      await this.temBillRepository.save(temBill);

      this.billGateway.emitUpdate(jobId, {
        status: 'Processing',
        step: 'Finalization',
        detail: 'Finalization complete.',
      });

      return true;
    } catch (error) {
      this.logger.error(`Error finalizing invoice ${invoice.id}:`, error);
      throw error;
    }
  }
  private generateFingerprint(
    invoice: ProcessingInvoice,
    account: TemAccount,
  ): string {
    const dataString = `${account.account_number}|${invoice.invoice_date}|${invoice.invoice_total}`;
    return require('crypto')
      .createHash('sha256')
      .update(dataString)
      .digest('hex');
  }

  // NOTE: We have not altered this archiveBill method since we will update it later when we handle archiveService similarly.
  private async archiveBill(
    temBill: TemBill,
    originalFilePath: string,
  ): Promise<void> {
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
      '/path/to/archives/',
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

    temBill.archived_file_path = newFilePath;
    await this.temBillRepository.save(temBill);
  }

  private sanitizeFileName(name: string): string {
    return name.replace(/[^a-z0-9]/gi, '_');
  }

  async getProcessedInvoices(): Promise<ProcessingInvoice[]> {
    try {
      const invoices = await this.invoiceRepository.find({
        relations: ['line_items'],
        order: { created_at: 'DESC' },
      });
      return invoices;
    } catch (error) {
      this.logger.error('Error fetching processed invoices:', error);
      throw error;
    }
  }

  private async findOrCreateLocation(
    processedData: any,
    customer: TemCustomer,
    temRecord: TemMasterView,
  ): Promise<Location> {
    const cissdmLocationId = temRecord.id_location;

    let location = await this.locationRepository.findOne({
      where: { cissdm_id: cissdmLocationId },
    });

    if (location) {
      this.logger.log(`Existing location found: ${location.name}`);
      return location;
    }

    const oldLocation = await this.cissdmLocationRepository.findOne({
      where: { id: cissdmLocationId },
    });

    if (!oldLocation) {
      throw new Error(
        `Location not found in cissdm database for ID: ${cissdmLocationId}`,
      );
    }

    location = new Location();
    location.customer = customer;
    location.customer_id = customer.id;
    location.name = oldLocation.name || 'Unknown Location';

    location.cissdm_id = cissdmLocationId;
    location.site_number = oldLocation.siteNumber || null;
    location.address = {
      address: oldLocation.address || null,
      suite: oldLocation.suite || null,
      city: oldLocation.city || null,
      state: oldLocation.state || null,
      zipcode: oldLocation.zipcode || null,
      country: oldLocation.country || null,
    };
    location.telephone = oldLocation.telephone || null;
    location.latitude = oldLocation.latitude || null;
    location.longitude = oldLocation.longitude || null;
    location.timezone = oldLocation.timezone || null;
    location.status = oldLocation.status || null;
    location.archived = oldLocation.archived === 1;
    location.id_dynamic_location = oldLocation.id_dynamic_location || null;
    location.location_alias = oldLocation.location_alias || null;
    location.verified = oldLocation.verified === 1;
    location.validate_msg = oldLocation.validateMsg || null;
    location.contact_name = oldLocation.contact_name || null;
    location.billing_contact = oldLocation.billing_contact || null;
    location.store_type = oldLocation.store_type || null;
    location.shipping_notes = oldLocation.shipping_notes || null;
    location.location_notes = oldLocation.location_notes || null;
    location.building_type = oldLocation.building_type || null;

    await this.locationRepository.save(location);
    this.logger.log(`Created new location: ${location.name}`);

    return location;
  }

  private async findOrCreateVendor(
    processedData: any,
    temRecord: TemMasterView,
  ): Promise<TemVendor> {
    const cissdmProviderId = temRecord.id_provider;

    if (!cissdmProviderId) {
      throw new Error(
        `No provider ID found in TEM record for accountNumber: ${temRecord.accountNumber}`,
      );
    }

    const provider = await this.cissdmProviderRepository.findOne({
      where: { id: cissdmProviderId },
    });

    if (!provider) {
      throw new Error(
        `Provider not found in cissdm database for ID: ${cissdmProviderId}`,
      );
    }

    const carrierName = provider.carriername || 'Unknown Vendor';

    let vendor = await this.temVendorRepository.findOne({
      where: { name: carrierName },
    });

    if (vendor) {
      this.logger.log(
        `Existing vendor found: ${vendor.name} (ID: ${vendor.id})`,
      );
      return vendor;
    }

    vendor = new TemVendor();
    vendor.name = carrierName;
    vendor.name_on_check = temRecord.nameOnCheck || null;
    vendor.phone = provider.telephone || null;
    vendor.is_active = true;

    vendor.address = {
      address1: temRecord.address1 || null,
      address2: temRecord.address2 || null,
      city: temRecord.addressCity || null,
      state: temRecord.addressState || null,
      zip: temRecord.addressZip || null,
    };

    await this.temVendorRepository.save(vendor);
    this.logger.log(`Created new vendor: ${vendor.name} (ID: ${vendor.id})`);

    return vendor;
  }

  private async findOrCreateCustomer(
    processedData: any,
    temRecord: TemMasterView,
  ): Promise<TemCustomer> {
    const cissdmCustomerId = temRecord.id_customer;

    let customer = await this.temCustomerRepository.findOne({
      where: { cissdm_id: cissdmCustomerId },
    });

    if (customer) {
      this.logger.log(`Existing customer found: ${customer.name}`);
      return customer;
    }

    const oldCustomer = await this.cissdmCustomerRepository.findOne({
      where: { id: cissdmCustomerId },
    });

    if (!oldCustomer) {
      throw new Error(
        `Customer not found in cissdm database for ID: ${cissdmCustomerId}`,
      );
    }

    customer = new TemCustomer();
    customer.name =
      oldCustomer.name || processedData.CustomerName || 'Unknown Customer';
    customer.abbreviation = oldCustomer.abbreviation || null;
    customer.is_active = oldCustomer.isActive === 1;
    customer.cissdm_id = cissdmCustomerId;

    await this.temCustomerRepository.save(customer);
    this.logger.log(`Created new customer: ${customer.name}`);

    return customer;
  }

  private async findOrCreateAccount(
    processedData: any,
    vendor: TemVendor,
    customer: TemCustomer,
    location: Location,
    invoice: ProcessingInvoice,
    temRecord: TemMasterView,
  ): Promise<TemAccount> {
    const accountNumber =
      processedData.CustomerId || temRecord.accountNumber || 'Unknown Account';

    let account = await this.temAccountRepository.findOne({
      where: {
        account_number: accountNumber,
        vendor: { id: vendor.id },
      },
      relations: ['vendor'],
    });

    if (account) {
      this.logger.log(`Existing account found: ${account.account_number}`);
      return account;
    }

    account = new TemAccount();
    account.account_number = accountNumber;
    account.vendor = vendor;
    account.customer = customer;
    account.location = location;
    account.bill_type = invoice.bill_type;
    account.status = temRecord.status === 1;
    account.expected_amount = temRecord.expectedAmount || null;
    account.username = temRecord.username || null;
    account.password = temRecord.password || null;
    account.url = temRecord.url || null;
    account.pay_type = temRecord.payType || null;
    account.multiple_locations = temRecord.multipleLocations === 1;

    account.name_on_check = temRecord.nameOnCheck || null;
    account.expected_amount = temRecord.expectedAmount || null;
    account.provider_name = temRecord.providerName || null;
    account.address1 = temRecord.address1 || null;
    account.address2 = temRecord.address2 || null;
    account.address_city = temRecord.addressCity || null;
    account.address_state = temRecord.addressState || null;
    account.address_zip = temRecord.addressZip || null;
    account.address_validated = temRecord.addressValidated === 1;
    account.last_invoice = temRecord.lastInvoice
      ? new Date(temRecord.lastInvoice)
      : null;
    account.last_amount = temRecord.lastAmount || null;
    account.vendor_balance = temRecord.vendorBalance || null;

    await this.temAccountRepository.save(account);
    this.logger.log(`Created new account: ${account.account_number}`);

    return account;
  }

  async getTemRecord(invoice: ProcessingInvoice): Promise<TemMasterView> {
    const accountNumber =
      invoice.invoice_id || invoice.customer_id || invoice.customer_name;

    this.logger.log(
      `Invoice ID: ${invoice.id}, Account Number: ${accountNumber}`,
    );

    const temRecord = await this.temMasterViewRepository.findOne({
      where: { accountNumber: accountNumber },
    });

    if (!temRecord) {
      this.logger.error(
        `No TEM record found for Account Number: ${accountNumber}`,
      );
      throw new Error(
        `TEM record not found for Account Number: ${accountNumber}`,
      );
    } else {
      this.logger.log(`Found TEM record for Account Number: ${accountNumber}`);
    }

    return temRecord;
  }

  async getProcessingQueue(): Promise<JobEntity[]> {
    this.logger.log('Fetching Processing Queue...');
    // Instead of looking up TemBills, we get the pending/in_progress jobs directly:
    const queue = await this.jobsService.getJobsInQueue('process_bill');
    this.logger.log(`Processing Queue Retrieved: ${queue.length} jobs.`);

    // Emit these jobs in the gateway if you do that here or return them.
    return queue;
  }

  async getAuditBills(): Promise<ProcessingInvoice[]> {
    try {
      const auditBills = await this.invoiceRepository.find({
        where: { status: 'Audit' },
        relations: ['line_items'],
        order: { created_at: 'DESC' },
      });
      return auditBills;
    } catch (error) {
      this.logger.error('Error fetching audit bills:', error);
      throw error;
    }
  }

  async getProcessedRecent(hours: number): Promise<TemBill[]> {
    this.logger.log(`Fetching Processed Bills from the last ${hours} hours...`);

    const since = new Date();
    since.setHours(since.getHours() - hours);

    const processed = await this.temBillRepository.find({
      where: {
        status: 'Processed',
        updated_at: MoreThan(since),
      },
      relations: [
        'account',
        'account.customer',
        'account.location',
        'account.vendor',
        'line_items',
      ],
      order: { updated_at: 'DESC' },
    });

    this.logger.log(`Processed Bills Retrieved: ${processed.length} bills.`);

    return processed;
  }

  async getTotalProcessedBills(): Promise<number> {
    const count = await this.temBillRepository.count({
      where: { status: 'Processed' },
    });
    return count;
  }

  async getValidationPassRate(): Promise<number> {
    const totalProcessed = await this.getTotalProcessedBills();
    const totalPassedValidation = await this.temBillRepository.count({
      where: {
        status: 'Processed',
        validation_status: 'Pass',
      },
    });
    return totalProcessed > 0
      ? (totalPassedValidation / totalProcessed) * 100
      : 0;
  }

  async countAuditBills(): Promise<number> {
    const count = await this.invoiceRepository.count({
      where: { status: 'Audit' },
    });
    return count;
  }

  async getBillById(id: number): Promise<TemBill | null> {
    this.logger.log(`Fetching Bill with ID: ${id}`);

    const bill = await this.temBillRepository.findOne({
      where: { id },
      relations: [
        'account',
        'account.customer',
        'account.location',
        'account.vendor',
        'line_items',
      ],
    });

    return bill || null;
  }
}
