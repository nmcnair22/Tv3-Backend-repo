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
import { ProcessingInvoiceLineItem } from '../entities/processing-invoice-line-item.entity';
import { ProcessingInvoice } from '../entities/processing-invoice.entity';

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

  /**
   * Analyzes a bill using Azure Document Intelligence.
   * @param filePath - The path to the uploaded PDF file.
   * @returns The saved ProcessingInvoice entity.
   */
  async analyzeWithAzure(filePath: string): Promise<ProcessingInvoice> {
    return this.azureLimit(async () => {
      if (!fs.existsSync(filePath)) {
        this.logger.error(`File not found: ${filePath}`);
        throw new Error(`File not found: ${filePath}`);
      }

      const fileSizeInBytes = fs.statSync(filePath).size;
      this.logger.log(`Analyzing file with Azure: ${filePath}`);
      this.logger.log(`File size: ${fileSizeInBytes} bytes`);

      if (fileSizeInBytes === 0) {
        this.logger.error(`File is empty: ${filePath}`);
        throw new Error(`File is empty: ${filePath}`);
      }

      this.logger.log(`Starting Azure analysis for file: ${filePath}`);

      try {
        const fileContent = fs.readFileSync(filePath);
        // Log the size of the file content
        this.logger.log(`File content size: ${fileContent.length} bytes`);

        const initialResponse = await this.client
          .path('/documentModels/{modelId}:analyze', 'prebuilt-invoice')
          .post({
            contentType: 'application/pdf',
            body: fileContent,
          });

        if (isUnexpected(initialResponse)) {
          throw initialResponse.body.error;
        }

        const poller = await getLongRunningPoller(this.client, initialResponse);
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

        // Extract all fields dynamically
        const extractedData = this.extractFields(document);
        this.logger.log(
          `Extracted data: ${JSON.stringify(extractedData, null, 2)}`,
        );

        // Save the extracted data to the database and get the saved invoice
        const savedInvoice = await this.saveExtractedData(extractedData);

        this.logger.log(`Saved invoice with ID: ${savedInvoice.id}`);

        return savedInvoice;
      } catch (error) {
        this.logger.error(`Azure analysis error: ${(error as Error).message}`);
        throw error;
      }
    });
  }

  /**
   * Dynamically extracts all fields from the analyzed document.
   * @param document - The analyzed document.
   * @returns An object containing all extracted fields.
   */
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

  /**
   * Saves the extracted data to the database.
   * @param extractedData - The data extracted from the invoice.
   * @returns The saved ProcessingInvoice entity.
   */
  private async saveExtractedData(
    extractedData: any,
  ): Promise<ProcessingInvoice> {
    // Map extracted data to invoice entity
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

    // Remove core fields to get other fields
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

    // Save the invoice
    const savedInvoice = await this.invoiceRepository.save(invoice);
    this.logger.log(`Invoice saved with ID: ${savedInvoice.id}`);

    // Save line items if any
    if (extractedData.Items && Array.isArray(extractedData.Items)) {
      for (const itemData of extractedData.Items) {
        if (!itemData) continue; // Handle null or undefined items
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

        // Remove core fields to get other fields
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
}
