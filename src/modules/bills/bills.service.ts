// src/modules/bills/bills.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import pLimit from 'p-limit';
import * as path from 'path';
import { Repository } from 'typeorm';

import { BillGateway } from './bill.gateway';
import { AnalyzeService } from './services/analyze.service';
import { BillTypeService } from './services/bill-type.service';
import { ValidationService } from './services/validate.service';

// Entities
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

@Injectable()
export class BillsService {
  private readonly logger = new Logger(BillsService.name);

  constructor(
    private readonly analyzeService: AnalyzeService,
    private readonly billTypeService: BillTypeService,
    private readonly validationService: ValidationService,

    @InjectRepository(ProcessingInvoice)
    private readonly invoiceRepository: Repository<ProcessingInvoice>,

    @InjectRepository(ProcessingInvoiceLineItem)
    private readonly lineItemRepository: Repository<ProcessingInvoiceLineItem>,

    // Repositories for the new entities
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
  ) {}

  /**
   * Processes all PDF bills found in the specified folder concurrently.
   * @param folderPath - The path to the folder containing PDF files.
   * @returns An array of processing results for each file.
   */
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

      // Get all PDF files in the folder
      const files = fs.readdirSync(folderPath);
      const pdfFiles = files.filter((file) =>
        file.toLowerCase().endsWith('.pdf'),
      );

      if (pdfFiles.length === 0) {
        this.logger.warn('No PDF files found in the folder.');
        return [];
      }

      const limit = pLimit(10); // Set concurrency limit to 10

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

  /**
   * Processes an individual file.
   * @param filePath - The path to the file.
   * @returns Processing result.
   */
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

  /**
   * Processes a single uploaded bill.
   * @param filePath - The path to the uploaded PDF file.
   * @returns Processing result.
   */
  async processBill(filePath: string): Promise<any> {
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

    const jobId = path.basename(filePath); // Use the file name as the job ID

    this.logger.log(
      `Starting bill processing for file: ${filePath}, Job ID: ${jobId}`,
    );
    this.logger.log(`File size: ${fileSizeInBytes} bytes`);

    try {
      this.logger.log(
        `Starting bill processing for file: ${filePath}, Job ID: ${jobId}`,
      );

      // Notify front end that processing has started
      this.billGateway.emitUpdate(jobId, {
        status: 'Processing',
        step: 'Started',
      });

      // Step 1: Analyze the invoice and get the saved invoice
      let savedInvoice = await this.analyzeService.analyzeWithAzure(filePath);

      if (!savedInvoice) {
        throw new Error('Saved invoice not found after analysis');
      }

      // Reload the invoice with line_items relation
      savedInvoice = await this.invoiceRepository.findOne({
        where: { id: savedInvoice.id },
        relations: ['line_items'],
      });

      this.logger.log(
        `Fetched savedInvoice with ID: ${savedInvoice.id}, Job ID: ${jobId}`,
      );

      // Notify front end that analysis is complete
      this.billGateway.emitUpdate(jobId, {
        status: 'Processing',
        step: 'AnalysisCompleted',
      });

      // Step 2: Determine bill type
      await this.billTypeService.determineBillType(savedInvoice);

      this.logger.log(
        `Determined bill type for invoice ${savedInvoice.id}: ${savedInvoice.bill_type}`,
      );

      // Notify front end about bill type
      this.billGateway.emitUpdate(jobId, {
        status: 'Processing',
        step: 'BillTypeDetermined',
        billType: savedInvoice.bill_type,
      });

      // Fetch the TEM record based on the invoice
      this.logger.log(
        `Fetching TEM record for invoice ID: ${savedInvoice.id}, Customer ID: ${savedInvoice.customer_id}`,
      );
      const temRecord = await this.billTypeService.getTemRecord(savedInvoice);

      if (!temRecord) {
        this.logger.error(
          `TEM record not found for invoice ID: ${savedInvoice.id}, Customer ID: ${savedInvoice.customer_id}`,
        );
        throw new Error(
          `TEM record not found for Customer ID ${savedInvoice.customer_id}. Unable to proceed with processing.`,
        );
      }

      // Check for audit flag set during bill type determination
      if (savedInvoice.audit_flag) {
        this.logger.warn(`Invoice ${savedInvoice.id} flagged for audit.`);
        // Notify front end that invoice is flagged for audit
        this.billGateway.emitUpdate(jobId, {
          status: 'Audit',
          step: 'FlaggedForAudit',
        });

        return {
          message: 'Invoice flagged for audit',
          invoiceId: savedInvoice.id,
          status: 'Audit',
        };
      }

      if (savedInvoice.bill_type === 'SLB') {
        // Step 3: Validate the invoice for SLB
        const validationResult = await this.validateInvoice(
          savedInvoice,
          jobId,
        );

        // Step 4: Finalize and store the invoice
        const isFinalized = await this.finalizeInvoice(
          savedInvoice,
          validationResult,
          filePath,
          temRecord, // Pass the temRecord here
        );

        // Adjust the response based on whether the invoice was saved or skipped due to duplicate
        let message = 'Bill processing completed';
        if (!isFinalized) {
          message = 'Duplicate bill detected, bill not processed';
        }

        // Notify front end about the result
        this.billGateway.emitUpdate(jobId, {
          status: isFinalized ? 'Completed' : 'Duplicate',
          step: isFinalized ? 'ProcessingCompleted' : 'DuplicateDetected',
        });

        return {
          message: message,
          invoiceId: savedInvoice.id,
          status: savedInvoice.validation_status || 'Processed',
          duplicate: !isFinalized, // Optional: indicate if the bill was a duplicate
        };
      } else if (savedInvoice.bill_type === 'MLB') {
        // MLB processing not implemented yet
        this.logger.warn(
          `Invoice ${savedInvoice.id} is MLB and will be processed later.`,
        );
        // Notify front end about MLB status
        this.billGateway.emitUpdate(jobId, {
          status: 'MLB Pending',
          step: 'MLBProcessingPending',
        });

        return {
          message: 'MLB processing not implemented yet',
          invoiceId: savedInvoice.id,
          status: 'MLB Pending',
        };
      }

      // Notify front end that processing is complete (should not reach here)
      this.billGateway.emitUpdate(jobId, {
        status: 'Completed',
        step: 'ProcessingCompleted',
      });

      return {
        message: 'Bill processing completed',
        invoiceId: savedInvoice.id,
        status: savedInvoice.validation_status || 'Processed',
      };
    } catch (error) {
      // Notify front end about the error
      this.billGateway.emitError(jobId, error.message);
      this.logger.error(
        `Error during bill processing (Job ID: ${jobId}):`,
        error,
      );
      throw error;
    }
  }

  /**
   * Validates the invoice using the ValidationService.
   * @param invoice - The ProcessingInvoice entity to validate.
   * @param jobId - The job ID for status updates.
   * @returns The validation result.
   */
  private async validateInvoice(
    invoice: ProcessingInvoice,
    jobId: string,
  ): Promise<ValidationResult> {
    this.logger.log(`Validating invoice ${invoice.id}, Job ID: ${jobId}`);

    try {
      // Notify front end that validation has started
      this.billGateway.emitUpdate(jobId, {
        status: 'Validating',
        step: 'ValidationStarted',
      });

      // Call the ValidationService to validate the invoice
      const validationResult =
        await this.validationService.validateInvoice(invoice);

      // Log the validation result for debugging
      this.logger.debug(
        `ValidationResult for invoice ${invoice.id}:`,
        validationResult,
      );

      // Update the invoice with validation results
      invoice.validation_status = validationResult.status || 'Unknown';
      invoice.validation_level = validationResult.level || 0;
      invoice.validation_errors = validationResult.errors || null;

      this.logger.log(
        `Invoice ${invoice.id} validation status: ${invoice.validation_status}, Level: ${invoice.validation_level}`,
      );

      // If validation failed, flag for audit
      if (validationResult.status === 'Fail') {
        invoice.audit_flag = true;
        this.logger.warn(
          `Invoice ${invoice.id} failed validation and is flagged for audit.`,
        );
        // Notify front end about failed validation
        this.billGateway.emitUpdate(jobId, {
          status: 'ValidationFailed',
          step: 'ValidationFailed',
          errors: validationResult.errors,
        });
      } else {
        invoice.audit_flag = false; // Ensure audit_flag is set to false when validation passes
        this.logger.log(
          `Invoice ${invoice.id} passed validation with level ${invoice.validation_level}`,
        );
        // Notify front end about passed validation
        this.billGateway.emitUpdate(jobId, {
          status: 'ValidationPassed',
          step: 'ValidationPassed',
          level: validationResult.level,
        });
      }

      // Save the updated invoice
      await this.invoiceRepository.save(invoice);

      // Optionally, update line items with categories from validationResult.LineItems
      if (validationResult.LineItems && validationResult.LineItems.length > 0) {
        for (const itemData of validationResult.LineItems) {
          const lineItem = invoice.line_items.find(
            (item: ProcessingInvoiceLineItem) =>
              item.description === itemData.Description &&
              parseFloat(item.amount.toString()) === itemData.Amount,
          );
          if (lineItem) {
            // Update line item with category and subcategory
            lineItem.category = itemData.Category || null;
            lineItem.subcategory = itemData.SubCategory || null;
            await this.lineItemRepository.save(lineItem);
            // Log the updated line item
            this.logger.log(
              `Updated line item ${lineItem.id} with category ${lineItem.category} and subcategory ${lineItem.subcategory}`,
            );
          }
        }
      }

      return validationResult;
    } catch (error) {
      this.logger.error(`Validation error for invoice ${invoice.id}:`, error);
      // Notify front end about validation error
      this.billGateway.emitError(jobId, `Validation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Finalizes the invoice by moving data to permanent tables and enriching it.
   * @param invoice - The ProcessingInvoice entity.
   * @param validationResult - The result from the validation step.
   * @param filePath - The file path of the original PDF (for archiving).
   * @returns A boolean indicating whether the invoice was saved (true) or skipped due to duplicate (false).
   */
  private async finalizeInvoice(
    invoice: ProcessingInvoice,
    validationResult: ValidationResult,
    filePath: string,
    temRecord: TemMasterView,
  ): Promise<boolean> {
    try {
      this.logger.log(`Finalizing invoice ${invoice.id}`);

      // Step 1: Enrich data and find or create related entities
      const vendor = await this.findOrCreateVendor(
        validationResult.ProcessedData,
        temRecord,
      );
      const customer = await this.findOrCreateCustomer(
        validationResult.ProcessedData,
        temRecord,
      );
      const location = await this.findOrCreateLocation(
        validationResult.ProcessedData,
        customer,
        temRecord,
      );
      const account = await this.findOrCreateAccount(
        validationResult.ProcessedData,
        vendor,
        customer,
        location,
        invoice,
        temRecord,
      );

      // Step 2: Create TemBill
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
      temBill.archived_file_path = null; // This will be set after archiving
      temBill.fingerprint = this.generateFingerprint(invoice, account);

      // Step 3: Prevent duplicates using fingerprint
      const existingBill = await this.temBillRepository.findOne({
        where: { fingerprint: temBill.fingerprint },
      });

      if (existingBill) {
        this.logger.warn(
          `Duplicate bill detected for fingerprint ${temBill.fingerprint}. Skipping save.`,
        );
        return false; // Indicate that the bill was not saved due to duplicate
      }

      // Step 4: Create TemBillLineItems
      const temBillLineItems: TemBillLineItem[] = [];
      if (validationResult.LineItems && validationResult.LineItems.length > 0) {
        for (const lineItemData of validationResult.LineItems) {
          const temLineItem = new TemBillLineItem();
          temLineItem.description = lineItemData.Description;
          temLineItem.amount = lineItemData.Amount;
          temLineItem.category = lineItemData.Category || null;
          temLineItem.subcategory = lineItemData.SubCategory || null;
          temLineItem.bill = temBill;
          temBillLineItems.push(temLineItem);
        }
      }

      // Associate line items with the bill
      temBill.line_items = temBillLineItems;

      // Step 5: Save TemBill and TemBillLineItems
      await this.temBillRepository.save(temBill);

      this.logger.log(
        `Invoice ${invoice.id} finalized and saved to tem_bills.`,
      );

      // Step 6: Archive the bill PDF
      await this.archiveBill(temBill, filePath);

      return true; // Indicate that the bill was successfully saved
    } catch (error) {
      this.logger.error(`Error finalizing invoice ${invoice.id}:`, error);
      throw error;
    }
  }

  /**
   * Generates a fingerprint for the bill to prevent duplicates.
   * @param invoice - The ProcessingInvoice entity.
   * @param account - The TemAccount entity.
   * @returns A unique fingerprint string.
   */
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

  /**
   * Archives the bill PDF to the designated folder.
   * @param temBill - The TemBill entity.
   * @param originalFilePath - The original file path of the uploaded PDF.
   */
  private async archiveBill(
    temBill: TemBill,
    originalFilePath: string,
  ): Promise<void> {
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
      '/path/to/archives/', // Replace with your actual archive root path
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

    // Update TemBill with the archived file path
    temBill.archived_file_path = newFilePath;
    await this.temBillRepository.save(temBill);
  }

  /**
   * Sanitizes a file or directory name by removing or replacing illegal characters.
   * @param name - The original name to sanitize.
   * @returns A sanitized file or directory name.
   */
  private sanitizeFileName(name: string): string {
    return name.replace(/[^a-z0-9]/gi, '_');
  }

  /**
   * Retrieves all processed invoices from the database.
   * @returns An array of processed invoices.
   */
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

    // Attempt to find the location by cissdm ID
    let location = await this.locationRepository.findOne({
      where: { cissdm_id: cissdmLocationId },
    });

    if (location) {
      this.logger.log(`Existing location found: ${location.name}`);
      return location; // Location exists, return it
    }

    // Location doesn't exist, fetch from cissdm database
    const oldLocation = await this.cissdmLocationRepository.findOne({
      where: { id: cissdmLocationId },
    });

    if (!oldLocation) {
      throw new Error(
        `Location not found in cissdm database for ID: ${cissdmLocationId}`,
      );
    }

    // Map fields based on your mappings
    location = new Location();
    location.customer = customer;
    location.customer_id = customer.id;
    location.name = oldLocation.name || 'Unknown Location';

    // Store the original cissdm location ID
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

    // Save the new location to the local database
    await this.locationRepository.save(location);
    this.logger.log(`Created new location: ${location.name}`);

    return location;
  }

  private async findOrCreateVendor(
    processedData: any,
    temRecord: TemMasterView,
  ): Promise<TemVendor> {
    const temVendorIdString = temRecord.id_vendor; // This is a string

    // Convert to number for use in new TemVendor entity
    const temVendorId = parseInt(temVendorIdString, 10);

    // Validate the parsed value
    if (isNaN(temVendorId)) {
      throw new Error(`Invalid vendor ID: ${temRecord.id_vendor}`);
    }

    // Attempt to find the vendor in the local database by tem_vendor_id
    let vendor = await this.temVendorRepository.findOne({
      where: { tem_vendor_id: temVendorId },
    });

    if (vendor) {
      this.logger.log(`Existing vendor found: ${vendor.name}`);
      return vendor; // Vendor exists, return it
    }

    // Vendor doesn't exist, fetch from tem database using the original string ID
    const oldVendor = await this.temVendorOldRepository.findOne({
      where: { id: temVendorIdString }, // Pass temVendorIdString (string) as id
    });

    if (!oldVendor) {
      throw new Error(
        `Vendor not found in tem database for ID: ${temVendorIdString}`,
      );
    }

    // Map fields
    vendor = new TemVendor();
    vendor.name =
      oldVendor.nameOnCheck ||
      oldVendor.name ||
      processedData.VendorName ||
      'Unknown Vendor';
    vendor.name_on_check = oldVendor.nameOnCheck || null;
    vendor.address = {
      address1: oldVendor.address1 || null,
      city: oldVendor.addressCity || null,
      state: oldVendor.addressState || null,
      zip: oldVendor.addressZip || null,
    };
    vendor.is_active = true; // Assuming new vendors are active

    // Store the original tem vendor ID as a number
    vendor.tem_vendor_id = temVendorId;

    // Save the new vendor
    await this.temVendorRepository.save(vendor);
    this.logger.log(`Created new vendor: ${vendor.name}`);

    return vendor;
  }
  private async findOrCreateCustomer(
    processedData: any,
    temRecord: TemMasterView,
  ): Promise<TemCustomer> {
    // The original customer ID from the cissdm database
    const cissdmCustomerId = temRecord.id_customer;

    // Attempt to find the customer by cissdm ID
    let customer = await this.temCustomerRepository.findOne({
      where: { cissdm_id: cissdmCustomerId },
    });

    if (customer) {
      this.logger.log(`Existing customer found: ${customer.name}`);
      return customer; // Customer exists, return it
    }

    // Customer doesn't exist in local database, fetch from cissdm database
    const oldCustomer = await this.cissdmCustomerRepository.findOne({
      where: { id: cissdmCustomerId },
    });

    if (!oldCustomer) {
      throw new Error(
        `Customer not found in cissdm database for ID: ${cissdmCustomerId}`,
      );
    }

    // Map fields based on your mappings
    customer = new TemCustomer();
    customer.name =
      oldCustomer.name || processedData.CustomerName || 'Unknown Customer';
    customer.abbreviation = oldCustomer.abbreviation || null;
    customer.is_active = oldCustomer.isActive === 1;

    // Store the original cissdm customer ID
    customer.cissdm_id = cissdmCustomerId;

    // Save the new customer to the local database
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

    // Attempt to find the account by account number and vendor
    let account = await this.temAccountRepository.findOne({
      where: {
        account_number: accountNumber,
        vendor: { id: vendor.id },
      },
      relations: ['vendor'],
    });

    if (account) {
      this.logger.log(`Existing account found: ${account.account_number}`);
      return account; // Account exists, return it
    }

    // Account doesn't exist, map fields from temRecord
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

    // Map additional fields
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

    // Save the new account to the local database
    await this.temAccountRepository.save(account);
    this.logger.log(`Created new account: ${account.account_number}`);

    return account;
  }

  async getTemRecord(invoice: ProcessingInvoice): Promise<TemMasterView> {
    // Implement logic to find the corresponding TEM record
    // For example, match based on account number or customer ID
    const accountNumber =
      invoice.customer_id || invoice.customer_name || invoice.customer_id;

    const temRecord = await this.temMasterViewRepository.findOne({
      where: { accountNumber: accountNumber },
    });

    return temRecord;
  }
}
