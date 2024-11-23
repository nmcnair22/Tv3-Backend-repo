// src/modules/bills/services/bills.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { IsNull, Not, Repository } from 'typeorm';
import { ProcessingInvoiceLineItem } from './entities/processing-invoice-line-item.entity';
import { ProcessingInvoice } from './entities/processing-invoice.entity';
import { AnalyzeService } from './services/analyze.service';
import { BillTypeService } from './services/bill-type.service';
import { ValidationService } from './services/validate.service';

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
  ) {}

  /**
   * Processes all PDF bills found in the specified folder.
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
      this.logger.log(`Starting bill processing for folder: ${folderPath}`);

      // Get all PDF files in the folder
      const files = fs.readdirSync(folderPath);
      const pdfFiles = files.filter((file) =>
        file.toLowerCase().endsWith('.pdf'),
      );

      if (pdfFiles.length === 0) {
        this.logger.warn('No PDF files found in the folder.');
        return [];
      }

      const processingResults = [];

      for (const file of pdfFiles) {
        const filePath = path.join(folderPath, file);
        this.logger.log(`Processing file: ${filePath}`);

        try {
          // Process each bill individually
          const result = await this.processBill(filePath);
          processingResults.push({
            file: file,
            result: result,
          });
        } catch (error) {
          this.logger.error(`Error processing file ${file}:`, error);
          processingResults.push({
            file: file,
            error: error.message,
          });
        }
      }

      return processingResults;
    } catch (error) {
      this.logger.error('Error during bulk bill processing:', error);
      throw error;
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

    try {
      this.logger.log(`Starting bill processing for file: ${filePath}`);

      // Step 1: Analyze the invoice
      await this.analyzeService.analyzeWithAzure(filePath);

      // Fetch the saved invoice from the database
      const savedInvoice = await this.invoiceRepository.findOne({
        where: { invoice_date: Not(IsNull()) },
        order: { created_at: 'DESC' },
        relations: ['line_items'],
      });

      if (!savedInvoice) {
        throw new Error('Saved invoice not found after analysis');
      }

      // Step 2: Determine bill type
      await this.billTypeService.determineBillType(savedInvoice);

      if (savedInvoice.audit_flag) {
        this.logger.warn(`Invoice ${savedInvoice.id} flagged for audit.`);
        return {
          message: 'Invoice flagged for audit',
          invoiceId: savedInvoice.id,
          status: 'Audit',
        };
      }

      if (savedInvoice.bill_type === 'SLB') {
        // Step 3: Validate the invoice for SLB
        await this.validateInvoice(savedInvoice);
      } else if (savedInvoice.bill_type === 'MLB') {
        // MLB processing not implemented yet
        this.logger.warn(
          `Invoice ${savedInvoice.id} is MLB and will be processed later.`,
        );
        return {
          message: 'MLB processing not implemented yet',
          invoiceId: savedInvoice.id,
          status: 'MLB Pending',
        };
      }

      // Proceed to next steps if necessary
      return {
        message: 'Bill processing completed',
        invoiceId: savedInvoice.id,
        status: savedInvoice.validation_status || 'Processed',
      };
    } catch (error) {
      this.logger.error('Error during bill processing:', error);
      throw error;
    }
  }

  /**
   * Validates the invoice using the ValidationService.
   * @param invoice - The ProcessingInvoice entity to validate.
   */
  private async validateInvoice(invoice: ProcessingInvoice): Promise<void> {
    this.logger.log(`Validating invoice ${invoice.id}`);

    try {
      const validationResult =
        await this.validationService.validateInvoice(invoice);

      // Update the invoice with validation results
      invoice.validation_status = validationResult.status;
      invoice.validation_level = validationResult.level;
      invoice.validation_errors = validationResult.errors || null;

      // If validation failed, flag for audit
      if (validationResult.status === 'Fail') {
        invoice.audit_flag = true;
        this.logger.warn(
          `Invoice ${invoice.id} failed validation and is flagged for audit.`,
        );
      } else {
        this.logger.log(
          `Invoice ${invoice.id} passed validation with level ${validationResult.level}`,
        );
      }

      // Save the updated invoice
      await this.invoiceRepository.save(invoice);

      // Optionally, update line items with categories from validationResult.updatedData.Items
      if (validationResult.updatedData && validationResult.updatedData.Items) {
        for (const itemData of validationResult.updatedData.Items) {
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
          }
        }
      }
    } catch (error) {
      this.logger.error(`Validation error for invoice ${invoice.id}:`, error);
      throw error;
    }
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

  // Add any additional methods as needed, such as methods for reprocessing invoices, handling audit flags, etc.
}
