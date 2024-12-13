// src/modules/bills/services/analyze.service.ts

import DocumentIntelligence, {
  AnalyzeResultOperationOutput,
  getLongRunningPoller,
  isUnexpected,
} from '@azure-rest/ai-document-intelligence';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import pLimit from 'p-limit';
import { Repository } from 'typeorm';
import { BillGateway } from '../bill.gateway';
import { EventType } from '../entities/event-log.entity';
import { ProcessingInvoiceLineItem } from '../entities/processing-invoice-line-item.entity';
import { ProcessingInvoice } from '../entities/processing-invoice.entity';
import { EventLogService } from './event-log.service';
// Import the new entities
import { ProcessingInvoiceTableCell } from '../entities/processing-invoice-table-cell.entity';
import { ProcessingInvoiceTable } from '../entities/processing-invoice-table.entity';

@Injectable()
export class AnalyzeService {
  private readonly logger = new Logger(AnalyzeService.name);
  private client;

  // Define a concurrency limit for Azure API calls
  private readonly azureLimit = pLimit(10);

  constructor(
    private configService: ConfigService,
    @InjectRepository(ProcessingInvoice)
    private invoiceRepository: Repository<ProcessingInvoice>,
    @InjectRepository(ProcessingInvoiceLineItem)
    private lineItemRepository: Repository<ProcessingInvoiceLineItem>,
    @InjectRepository(ProcessingInvoiceTable)
    private processingInvoiceTableRepository: Repository<ProcessingInvoiceTable>,
    @InjectRepository(ProcessingInvoiceTableCell)
    private processingInvoiceTableCellRepository: Repository<ProcessingInvoiceTableCell>,
    private readonly billGateway: BillGateway,
    private readonly eventLogService: EventLogService,
  ) {
    const key = this.configService.get<string>('AZURE_FORM_RECOGNIZER_KEY');
    const endpoint = this.configService.get<string>(
      'AZURE_FORM_RECOGNIZER_ENDPOINT',
    );

    if (!key || !endpoint) {
      this.logger.error('Azure Document Intelligence credentials are not set.');
      throw new Error('Azure Document Intelligence credentials are not set.');
    }

    // Initialize the client
    this.client = DocumentIntelligence(endpoint, { key });
  }

  async analyzeWithAzure(
    filePath: string,
    jobId: string,
  ): Promise<ProcessingInvoice> {
    return this.azureLimit(async () => {
      // Emit update that analysis is starting
      this.billGateway.emitUpdate(jobId, {
        status: 'Processing',
        step: 'AnalysisStarted',
        detail: 'Sending file to Azure for analysis...',
      });

      await this.eventLogService.logEvent(
        jobId,
        EventType.INFO,
        'Starting Azure document analysis.',
        { filePath },
      );

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        this.logger.error(`File not found: ${filePath}`);
        this.billGateway.emitError(jobId, 'File not found for analysis.');
        await this.eventLogService.logEvent(
          jobId,
          EventType.ERROR,
          'File not found during analysis.',
          { filePath },
        );
        throw new Error(`File not found: ${filePath}`);
      }

      const fileSizeInBytes = fs.statSync(filePath).size;
      this.logger.log(`Analyzing file with Azure: ${filePath}`);
      this.logger.log(`File size: ${fileSizeInBytes} bytes`);

      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
      if (fileSizeInBytes > MAX_FILE_SIZE) {
        const errMsg = `File size exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`;
        this.logger.error(errMsg);
        this.billGateway.emitError(jobId, errMsg);
        await this.eventLogService.logEvent(
          jobId,
          EventType.ERROR,
          'File size too large for analysis.',
          { filePath, fileSize: fileSizeInBytes },
        );
        throw new Error(errMsg);
      }

      if (fileSizeInBytes === 0) {
        const errMsg = `File is empty: ${filePath}`;
        this.logger.error(errMsg);
        this.billGateway.emitError(jobId, errMsg);
        await this.eventLogService.logEvent(
          jobId,
          EventType.ERROR,
          'Empty file provided for analysis.',
          { filePath },
        );
        throw new Error(errMsg);
      }

      this.logger.log(`Starting Azure analysis for file: ${filePath}`);
      this.billGateway.emitUpdate(jobId, {
        status: 'Processing',
        step: 'AnalysisInProgress',
        detail: 'File sent to Azure, awaiting analysis results...',
      });

      const maxRetries = 3;
      let attempt = 0;

      while (attempt < maxRetries) {
        try {
          const fileContent = fs.readFileSync(filePath);

          // Introduce delay to prevent rate limiting
          await new Promise((resolve) => setTimeout(resolve, 200)); // 200ms delay

          const initialResponse = await this.client
            .path('/documentModels/{modelId}:analyze', 'prebuilt-invoice')
            .post({
              contentType: 'application/pdf',
              body: fileContent,
            });

          if (isUnexpected(initialResponse)) {
            throw initialResponse.body.error;
          }

          const poller = await getLongRunningPoller(
            this.client,
            initialResponse,
          );
          const response = await poller.pollUntilDone();

          if (isUnexpected(response)) {
            throw response.body.error;
          }

          const result = response.body as AnalyzeResultOperationOutput;
          const analyzeResult = result.analyzeResult;

          if (!analyzeResult) {
            throw new Error('Failed to analyze the invoice.');
          }

          const documents = analyzeResult.documents;
          const document = documents && documents[0];
          if (!document) {
            throw new Error('Expected at least one document in the result.');
          }

          // Extract fields
          const extractedData = this.extractFields(document);
          this.logger.log(
            `Extracted data: ${JSON.stringify(extractedData, null, 2)}`,
          );

          this.billGateway.emitUpdate(jobId, {
            status: 'Processing',
            step: 'AnalysisDataExtracted',
            detail: 'Data extracted from Azure response, saving to database...',
          });

          const savedInvoice = await this.saveExtractedData(extractedData);

          this.logger.log(`Saved invoice with ID: ${savedInvoice.id}`);
          this.billGateway.emitUpdate(jobId, {
            status: 'Processing',
            step: 'AnalysisCompleted',
            detail: 'Invoice data saved successfully after analysis.',
          });

          // Save the filtered tables to the database
          if (analyzeResult.tables && analyzeResult.tables.length > 0) {
            const filteredTables = this.filterTableData(analyzeResult.tables);
            this.logger.log(
              'Filtered Table Data:\n' +
                JSON.stringify(filteredTables, null, 2),
            );

            // Save each table and its cells
            for (const tableData of filteredTables) {
              const invoiceTable = new ProcessingInvoiceTable();
              invoiceTable.invoice = savedInvoice;
              invoiceTable.row_count = tableData.rowCount;
              invoiceTable.column_count = tableData.columnCount;
              const savedTable =
                await this.processingInvoiceTableRepository.save(invoiceTable);

              for (const cellData of tableData.cells) {
                const cell = new ProcessingInvoiceTableCell();
                cell.table = savedTable;
                cell.row_index = cellData.rowIndex;
                cell.column_index = cellData.columnIndex;
                cell.content = cellData.content || null;
                await this.processingInvoiceTableCellRepository.save(cell);
              }

              this.logger.log(
                `Table with ID: ${savedTable.id} saved for invoice ID: ${savedInvoice.id}`,
              );
            }
          } else {
            this.logger.log('No tables found in the analysis result.');
          }

          await this.eventLogService.logEvent(
            jobId,
            EventType.INFO,
            'Azure document analysis completed successfully.',
            { invoiceId: savedInvoice.id },
          );

          return savedInvoice;
        } catch (error) {
          attempt++;
          const statusCode =
            error.statusCode || error.response?.statusCode || 0;
          const isRetryable = [429, 500, 502, 503, 504].includes(statusCode);

          if (isRetryable && attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
            this.logger.warn(
              `Attempt ${attempt} failed with status ${statusCode}. Retrying in ${delay} ms...`,
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            const errMsg = `Analysis failed after ${attempt} attempts: ${error.message}`;
            this.logger.error(errMsg, { error });
            this.billGateway.emitError(jobId, errMsg);
            await this.eventLogService.logEvent(
              jobId,
              EventType.ERROR,
              'Azure document analysis failed.',
              { attempts: attempt, error: error.message },
            );
            throw error;
          }
        }
      }
    });
  }

  private extractFields(document: any): any {
    const fields = document.fields;

    const extractFieldValue = (field: any): any => {
      if (!field) return null;

      switch (field.kind || field.type) {
        case 'string':
          return field.valueString || field.content || null;
        case 'number':
          return field.valueNumber ?? null;
        case 'integer':
          return field.valueInteger ?? null;
        case 'double':
          return field.valueNumber ?? null;
        case 'date':
          return field.valueDate ?? null;
        case 'time':
          return field.valueTime ?? null;
        case 'phoneNumber':
          return field.valuePhoneNumber ?? null;
        case 'currency':
          return field.valueCurrency?.amount ?? null;
        case 'address':
          return field.valueAddress || field.content || null;
        case 'array':
          if (field.valueArray) {
            return field.valueArray.map((itemField: any) =>
              extractFieldValue(itemField),
            );
          } else {
            return null;
          }
        case 'object':
          if (field.valueObject) {
            const obj: any = {};
            for (const key in field.valueObject) {
              obj[key] = extractFieldValue(field.valueObject[key]);
            }
            return obj;
          } else {
            return null;
          }
        default:
          return null;
      }
    };

    const extractedData: any = {};
    for (const fieldName in fields) {
      extractedData[fieldName] = extractFieldValue(fields[fieldName]);
    }

    return extractedData;
  }

  private async saveExtractedData(
    extractedData: any,
  ): Promise<ProcessingInvoice> {
    const invoice = new ProcessingInvoice();
    invoice.invoice_id = extractedData.InvoiceId ?? null;
    invoice.invoice_date = extractedData.InvoiceDate ?? null;
    invoice.due_date = extractedData.DueDate ?? null;
    invoice.vendor_name = extractedData.VendorName ?? null;
    invoice.vendor_address = extractedData.VendorAddress ?? null;
    invoice.vendor_address_recipient =
      extractedData.VendorAddressRecipient ?? null;
    invoice.customer_name = extractedData.CustomerName ?? null;
    invoice.customer_id = extractedData.CustomerId ?? null;
    invoice.customer_address = extractedData.CustomerAddress ?? null;
    invoice.customer_address_recipient =
      extractedData.CustomerAddressRecipient ?? null;
    invoice.purchase_order = extractedData.PurchaseOrder ?? null;
    invoice.payment_term = extractedData.PaymentTerm ?? null;
    invoice.vendor_tax_id = extractedData.VendorTaxId ?? null;
    invoice.customer_tax_id = extractedData.CustomerTaxId ?? null;
    invoice.subtotal = extractedData.SubTotal ?? null;
    invoice.total_tax = extractedData.TotalTax ?? null;
    invoice.total_discount = extractedData.TotalDiscount ?? null;
    invoice.invoice_total = extractedData.InvoiceTotal ?? null;
    invoice.amount_due = extractedData.AmountDue ?? null;
    invoice.previous_unpaid_balance =
      extractedData.PreviousUnpaidBalance ?? null;
    invoice.remittance_address = extractedData.RemittanceAddress ?? null;
    invoice.remittance_address_recipient =
      extractedData.RemittanceAddressRecipient ?? null;
    invoice.service_start_date = extractedData.ServiceStartDate ?? null;
    invoice.service_end_date = extractedData.ServiceEndDate ?? null;

    const otherFields = { ...extractedData };
    const coreFields = [
      'InvoiceId',
      'InvoiceDate',
      'DueDate',
      'VendorName',
      'VendorAddress',
      'VendorAddressRecipient',
      'CustomerName',
      'CustomerId',
      'CustomerAddress',
      'CustomerAddressRecipient',
      'PurchaseOrder',
      'PaymentTerm',
      'VendorTaxId',
      'CustomerTaxId',
      'SubTotal',
      'TotalTax',
      'TotalDiscount',
      'InvoiceTotal',
      'AmountDue',
      'PreviousUnpaidBalance',
      'RemittanceAddress',
      'RemittanceAddressRecipient',
      'ServiceStartDate',
      'ServiceEndDate',
      'Items',
    ];
    coreFields.forEach((field) => delete otherFields[field]);
    invoice.other_fields = otherFields;

    const savedInvoice = await this.invoiceRepository.save(invoice);
    this.logger.log(`Invoice saved with ID: ${savedInvoice.id}`);

    if (extractedData.Items && Array.isArray(extractedData.Items)) {
      for (const itemData of extractedData.Items) {
        if (!itemData) continue;
        const lineItem = new ProcessingInvoiceLineItem();
        lineItem.invoice = savedInvoice;
        lineItem.description = itemData.Description || null;
        lineItem.amount = itemData.Amount || null;
        lineItem.date = itemData.Date || null;
        lineItem.quantity = itemData.Quantity || null;
        lineItem.unit_price = itemData.UnitPrice || null;
        lineItem.product_code = itemData.ProductCode || null;
        lineItem.tax = itemData.Tax || null;
        lineItem.tax_rate = itemData.TaxRate || null;
        lineItem.unit = itemData.Unit || null;

        const itemOtherFields = { ...itemData };
        const itemCoreFields = [
          'Description',
          'Amount',
          'Date',
          'Quantity',
          'UnitPrice',
          'ProductCode',
          'Tax',
          'TaxRate',
          'Unit',
        ];
        itemCoreFields.forEach((field) => delete itemOtherFields[field]);
        lineItem.other_fields = itemOtherFields;

        await this.lineItemRepository.save(lineItem);
        this.logger.log(
          `Line item saved for invoice ID ${savedInvoice.id}: ${lineItem.description}`,
        );
      }
    }

    return savedInvoice;
  }

  private filterTableData(rawTables: any[]): any[] {
    if (!rawTables || !Array.isArray(rawTables)) {
      return [];
    }

    return rawTables.map((table) => {
      const { rowCount, columnCount, cells } = table;
      const filteredCells = cells.map((cell: any) => ({
        rowIndex: cell.rowIndex,
        columnIndex: cell.columnIndex,
        content: cell.content,
      }));
      return {
        rowCount,
        columnCount,
        cells: filteredCells,
      };
    });
  }
}
