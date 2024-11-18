// src/modules/bills/services/analyze.service.ts

import {
  AnalyzedDocument,
  DocumentAnalysisClient,
  DocumentField,
} from '@azure/ai-form-recognizer';
import { AzureKeyCredential } from '@azure/core-auth';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import {
  ExtractedData,
  Instalment,
  Item,
  PaymentDetail,
  TaxDetail,
} from '../interfaces/extracted-data.interface'; // <-- Correct Import

@Injectable()
export class AnalyzeService {
  private readonly logger = new Logger(AnalyzeService.name);
  private client: DocumentAnalysisClient;

  constructor(private configService: ConfigService) {
    const key = this.configService.get<string>('AZURE_FORM_RECOGNIZER_KEY');
    const endpoint = this.configService.get<string>(
      'AZURE_FORM_RECOGNIZER_ENDPOINT',
    );
    this.client = new DocumentAnalysisClient(
      endpoint,
      new AzureKeyCredential(key),
    );
  }

  async analyzeWithAzure(filePath: string): Promise<ExtractedData> {
    try {
      // Ensure the file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const readStream = fs.createReadStream(filePath);
      this.logger.log(`Starting Azure analysis for file: ${filePath}`);

      // Analyze using the prebuilt-invoice model
      const poller = await this.client.beginAnalyzeDocument(
        'prebuilt-invoice',
        readStream,
      );

      const result = await poller.pollUntilDone();

      if (!result.documents || result.documents.length === 0) {
        throw new Error('Failed to extract data from the invoice.');
      }

      const invoice = result.documents[0];

      const extractedData = this.extractFields(invoice);
      this.logger.log(
        `Extracted data: ${JSON.stringify(extractedData, null, 2)}`,
      );

      return extractedData;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Azure analysis error: ${error.message}`);
      } else {
        this.logger.error('Azure analysis error: Unknown error');
      }
      throw error;
    }
  }

  private extractFields(invoice: AnalyzedDocument): ExtractedData {
    const fields = invoice.fields;

    // Helper functions to extract field content safely
    const getStringField = (fieldName: string): string | null => {
      const field = fields[fieldName];
      if (field && field.kind === 'string' && field.value) {
        return field.value as string;
      }
      return null;
    };


    const getCurrencyField = (fieldName: string): number | null => {
      const field = fields[fieldName];
      if (field && field.kind === 'currency' && field.value) {
        return (field.value as { amount: number }).amount; // Adjust based on actual type
      }
      return null;
    };

    const getDateField = (fieldName: string): string | null => {
      const field = fields[fieldName];
      if (field && field.kind === 'date' && field.value) {
        return (field.value as Date).toISOString();
      }
      return null;
    };

    const getAddressField = (fieldName: string): Record<string, unknown> | null => {
      const field = fields[fieldName];
      if (field && field.kind === 'address' && field.value) {
        return field.value as Record<string, unknown>;
      }
      return null;
    };

    // Extract top-level fields
    const extractedData: ExtractedData = {
      VendorName: getStringField('VendorName'),
      VendorAddress: getAddressField('VendorAddress'),
      VendorAddressRecipient: getStringField('VendorAddressRecipient'),
      VendorTaxId: getStringField('VendorTaxId'),
      CustomerName: getStringField('CustomerName'),
      CustomerId: getStringField('CustomerId'),
      CustomerAddress: getAddressField('CustomerAddress'),
      CustomerAddressRecipient: getStringField('CustomerAddressRecipient'),
      CustomerTaxId: getStringField('CustomerTaxId'),
      BillingAddress: getAddressField('BillingAddress'),
      BillingAddressRecipient: getStringField('BillingAddressRecipient'),
      ShippingAddress: getAddressField('ShippingAddress'),
      ShippingAddressRecipient: getStringField('ShippingAddressRecipient'),
      InvoiceId: getStringField('InvoiceId'),
      InvoiceDate: getDateField('InvoiceDate'),
      DueDate: getDateField('DueDate'),
      PurchaseOrder: getStringField('PurchaseOrder'),
      SubTotal: getCurrencyField('SubTotal'),
      TotalTax: getCurrencyField('TotalTax'),
      TotalDiscount: getCurrencyField('TotalDiscount'),
      InvoiceTotal: getCurrencyField('InvoiceTotal'),
      AmountDue: getCurrencyField('AmountDue'),
      PreviousUnpaidBalance: getCurrencyField('PreviousUnpaidBalance'),
      PaymentTerm: getStringField('PaymentTerm'),
      RemittanceAddress: getAddressField('RemittanceAddress'),
      RemittanceAddressRecipient: getStringField('RemittanceAddressRecipient'),
      ServiceAddress: getAddressField('ServiceAddress'),
      ServiceAddressRecipient: getStringField('ServiceAddressRecipient'),
      ServiceStartDate: getDateField('ServiceStartDate'),
      ServiceEndDate: getDateField('ServiceEndDate'),
      KVKNumber: getStringField('KVKNumber'),
      PaymentDetails: this.extractArrayField<PaymentDetail>(fields, 'PaymentDetails'),
      TaxDetails: this.extractArrayField<TaxDetail>(fields, 'TaxDetails'),
      PaidInFourInstalments: this.extractArrayField<Instalment>(fields, 'PaidInFourInstalments'),
      Items: [], // Initialize Items as an empty array
    };

    // Extract line items
    const itemsField = fields['Items'];
    if (itemsField && itemsField.kind === 'array' && itemsField.values) {
      extractedData.Items = itemsField.values.map((item) => {
        if (item.kind !== 'object' || !item.properties) {
          return null;
        }
        const itemFields = item.properties;

        const getItemStringField = (fieldName: string): string | null => {
          const field = itemFields[fieldName];
          if (field && field.kind === 'string' && field.value) {
            return field.value as string;
          }
          return null;
        };

        const getItemNumberField = (fieldName: string): number | null => {
          const field = itemFields[fieldName];
          if (
            field &&
            (field.kind === 'number' || field.kind === 'integer') &&
            field.value !== undefined
          ) {
            return field.value as number;
          }
          return null;
        };

        const getItemCurrencyField = (fieldName: string): number | null => {
          const field = itemFields[fieldName];
          if (field && field.kind === 'currency' && field.value) {
            return (field.value as { amount: number }).amount; // Adjust based on actual type
          }
          return null;
        };

        const getItemDateField = (fieldName: string): string | null => {
          const field = itemFields[fieldName];
          if (field && field.kind === 'date' && field.value) {
            return (field.value as Date).toISOString();
          }
          return null;
        };

        return {
          Description: getItemStringField('Description'),
          Quantity: getItemNumberField('Quantity'),
          UnitPrice: getItemCurrencyField('UnitPrice'),
          Amount: getItemCurrencyField('Amount'),
          ProductCode: getItemStringField('ProductCode'),
          Date: getItemDateField('Date'),
          Tax: getItemCurrencyField('Tax'),
          TaxRate: getItemStringField('TaxRate'),
          Unit: getItemStringField('Unit'),
          Discount: getItemCurrencyField('Discount'),
        } as Item;
      }).filter(item => item !== null) as Item[];
    }

    return extractedData;
  }

  // Generic helper method to extract array fields with strong typing
  private extractArrayField<T>(fields: Record<string, DocumentField>, fieldName: string): T[] | null {
    const field = fields[fieldName];
    if (field && field.kind === 'array' && field.values) {
      return field.values.map((item) => {
        if (item.kind !== 'object' || !item.properties) {
          return null;
        }
        const itemFields = item.properties;

        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(itemFields)) {
          const typedValue = value as DocumentField; // Cast to DocumentField
          if (typedValue.kind === 'string' && typedValue.value) {
            result[key] = typedValue.value as string;
          } else if (
            (typedValue.kind === 'number' || typedValue.kind === 'integer') &&
            typedValue.value !== undefined
          ) {
            result[key] = typedValue.value as number;
          } else if (typedValue.kind === 'currency' && typedValue.value) {
            result[key] = (typedValue.value as { amount: number }).amount; // Adjust based on actual type
          } else if (typedValue.kind === 'date' && typedValue.value) {
            result[key] = (typedValue.value as Date).toISOString();
          } else {
            result[key] = null;
          }
        }
        return result as T;
      }).filter(item => item !== null) as T[];
    }
    return null;
  }

  async analyzeWithAzureLayoutModel(): Promise<string> {
    // Implement if needed
    return 'Layout analysis result';
  }
}
