import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { DynamicsAuthService } from 'src/modules/dynamics/dynamics-auth.service'; // Adjust path if necessary

@Injectable()
export class V2ApiService {
  private readonly logger = new Logger(V2ApiService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly dynamicsAuthService: DynamicsAuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get the base URL for the API.
   */
  private baseUrl(): string {
    const tenantId = this.configService.get<string>('tenant_id');
    const environmentId = this.configService.get<string>('environment_id');
    const companyId = this.configService.get<string>('company_id');
    return `https://api.businesscentral.dynamics.com/v2.0/${tenantId}/${environmentId}/api/v2.0/companies(${companyId})`;
  }

  /**
   * Make a GET request to the specified URL with authentication and optional query parameters.
   */
  private async getRequest(url: string, params?: Record<string, any>): Promise<any[]> {
    try {
      const headers = await this.dynamicsAuthService.getHeaders();
      const config: AxiosRequestConfig = {
        headers,
        params,
      };

      const response = await firstValueFrom(
        this.httpService.get(url, config),
      );

      this.logger.debug(`GET request to ${url} succeeded with status ${response.status}`);
      return response.data.value; // Assuming OData response
    } catch (error) {
    const err = error as any;
      if (err.response) {
        this.logger.error(`GET request to ${url} failed with status ${err.response.status}: ${err.response.statusText}`);
        this.logger.error(`Response Data: ${JSON.stringify(err.response.data)}`);
      } else if (err.request) {
        this.logger.error(`GET request to ${url} failed: No response received.`);
      } else {
        this.logger.error(`GET request to ${url} failed: ${err.message}`);
      }
      throw new HttpException(
        `Failed to fetch data from ${url}`,
        err.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Fetch customers from the API with specified fields and optional last sync date for incremental sync.
   */
  async getCustomers(lastSyncDateTime?: Date): Promise<any[]> {
    const url = `${this.baseUrl()}/customers`;
    const params: any = {
      '$select': 'id,number,displayName,addressLine1,addressLine2,city,state,postalCode,country,phoneNumber,email,website,balanceDue,creditLimit,taxRegistrationNumber,currencyCode,lastModifiedDateTime',
    };
    if (lastSyncDateTime) {
      params['$filter'] = `lastModifiedDateTime gt ${lastSyncDateTime.toISOString()}`;
    }
    return await this.getRequest(url, params);
  }

  /**
   * Fetch vendors from the API with specified fields and optional last sync date for incremental sync.
   */
  async getVendors(lastSyncDateTime?: Date): Promise<any[]> {
    const url = `${this.baseUrl()}/vendors`;
    const params: any = {
      '$select': 'id,number,displayName,addressLine1,addressLine2,city,state,country,postalCode,phoneNumber,email,website,taxRegistrationNumber,currencyCode,irs1099Code,paymentTermsId,paymentMethodId,taxLiable,blocked,balance,lastModifiedDateTime',
    };
    if (lastSyncDateTime) {
      params['$filter'] = `lastModifiedDateTime gt ${lastSyncDateTime.toISOString()}`;
    }
    return await this.getRequest(url, params);
  }

  /**
   * Fetch items from the API with optional last sync date for incremental sync.
   */
  async getItems(lastSyncDateTime?: Date): Promise<any[]> {
    const url = `${this.baseUrl()}/items`;
    const params: any = {
      '$select': 'id,number,displayName,displayName2,type,itemCategoryId,itemCategoryCode,blocked,gtin,inventory,unitPrice,priceIncludesTax,unitCost,taxGroupId,taxGroupCode,baseUnitOfMeasureId,baseUnitOfMeasureCode,generalProductPostingGroupId,generalProductPostingGroupCode,inventoryPostingGroupId,inventoryPostingGroupCode,lastModifiedDateTime',
    };
    if (lastSyncDateTime) {
      params['$filter'] = `lastModifiedDateTime gt ${lastSyncDateTime.toISOString()}`;
    }
    return await this.getRequest(url, params);
  }

 /**
   * Fetch sales invoices from the API with optional last sync date for incremental sync.
   */
 async getSalesInvoices(lastSyncDateTime?: Date): Promise<any[]> {
  const url = `${this.baseUrl()}/salesInvoices`;
  const params: any = {
    '$select': 'id,number,externalDocumentNumber,invoiceDate,postingDate,dueDate,promisedPayDate,customerPurchaseOrderReference,customerId,customerNumber,customerName,billToName,billToCustomerId,billToCustomerNumber,shipToName,shipToContact,sellToAddressLine1,sellToAddressLine2,sellToCity,sellToState,sellToPostCode,sellToCountry,billToAddressLine1,billToAddressLine2,billToCity,billToState,billToPostCode,billToCountry,shipToAddressLine1,shipToAddressLine2,shipToCity,shipToState,shipToPostCode,shipToCountry,currencyCode,paymentTermsId,shipmentMethodId,salesperson,pricesIncludeTax,remainingAmount,discountAmount,discountAppliedBeforeTax,totalAmountExcludingTax,totalTaxAmount,totalAmountIncludingTax,status,lastModifiedDateTime,phoneNumber,email',
  };
  if (lastSyncDateTime) {
    params['$filter'] = `lastModifiedDateTime gt ${lastSyncDateTime.toISOString()}`;
  }
  return await this.getRequest(url, params);
}

  /**
   * Fetch sales invoice lines for a specific invoice.
   * @param invoiceId The ID of the sales invoice.
   */
  async getSalesInvoiceLines(invoiceId: string): Promise<any[]> {
    const url = `${this.baseUrl()}/salesInvoices(${invoiceId})/salesInvoiceLines`;
    const params = {
      '$select': 'id,documentId,sequence,itemId,accountId,lineType,lineObjectNumber,description,description2,unitOfMeasureId,unitOfMeasureCode,quantity,unitPrice,discountAmount,discountPercent,discountAppliedBeforeTax,amountExcludingTax,taxCode,taxPercent,totalTaxAmount,amountIncludingTax,invoiceDiscountAllocation,netAmount,netTaxAmount,netAmountIncludingTax,shipmentDate,itemVariantId,locationId',
    };
    return await this.getRequest(url, params);
  }

/**
 * Fetch sales credit memos from the API with optional last sync date for incremental sync.
 */
async getSalesCreditMemos(lastSyncDateTime?: Date): Promise<any[]> {
  const url = `${this.baseUrl()}/salesCreditMemos`;
  const params: any = {
    '$select': 'id,number,externalDocumentNumber,creditMemoDate,postingDate,dueDate,customerId,customerNumber,customerName,billToName,billToCustomerId,billToCustomerNumber,sellToAddressLine1,sellToAddressLine2,sellToCity,sellToState,sellToPostCode,sellToCountry,billToAddressLine1,billToAddressLine2,billToCity,billToState,billToPostCode,billToCountry,currencyCode,paymentTermsId,shipmentMethodId,salesperson,pricesIncludeTax,discountAmount,discountAppliedBeforeTax,totalAmountExcludingTax,totalTaxAmount,totalAmountIncludingTax,status,lastModifiedDateTime,invoiceId,invoiceNumber,phoneNumber,email,customerReturnReasonId',
  };
  if (lastSyncDateTime) {
    params['$filter'] = `lastModifiedDateTime gt ${lastSyncDateTime.toISOString()}`;
  }
  return await this.getRequest(url, params);
}

/**
 * Fetch sales credit memo lines for a specific credit memo.
 * @param creditMemoId The ID of the sales credit memo.
 */
async getSalesCreditMemoLines(creditMemoId: string): Promise<any[]> {
  const url = `${this.baseUrl()}/salesCreditMemos(${creditMemoId})/salesCreditMemoLines`;
  const params = {
    '$select': 'id,documentId,sequence,itemId,accountId,lineType,lineObjectNumber,description,description2,unitOfMeasureId,unitOfMeasureCode,unitPrice,quantity,discountAmount,discountPercent,discountAppliedBeforeTax,amountExcludingTax,taxCode,taxPercent,totalTaxAmount,amountIncludingTax,invoiceDiscountAllocation,netAmount,netTaxAmount,netAmountIncludingTax,shipmentDate,itemVariantId,locationId',
  };
  return await this.getRequest(url, params);
}

/**
 * Fetch purchase invoices from the API with optional last sync date for incremental sync.
 */
async getPurchaseInvoices(lastSyncDateTime?: Date): Promise<any[]> {
  const url = `${this.baseUrl()}/purchaseInvoices`;
  const params: any = {
    '$select': 'id,number,postingDate,invoiceDate,dueDate,vendorInvoiceNumber,vendorId,vendorNumber,vendorName,payToName,payToContact,payToVendorId,payToVendorNumber,shipToName,shipToContact,buyFromAddressLine1,buyFromAddressLine2,buyFromCity,buyFromState,buyFromPostCode,buyFromCountry,shipToAddressLine1,shipToAddressLine2,shipToCity,shipToState,shipToPostCode,shipToCountry,payToAddressLine1,payToAddressLine2,payToCity,payToState,payToPostCode,payToCountry,currencyCode,orderId,orderNumber,purchaser,pricesIncludeTax,discountAmount,discountAppliedBeforeTax,totalAmountExcludingTax,totalTaxAmount,totalAmountIncludingTax,status,lastModifiedDateTime',
  };
  if (lastSyncDateTime) {
    params['$filter'] = `lastModifiedDateTime gt ${lastSyncDateTime.toISOString()}`;
  }
  return await this.getRequest(url, params);
}

/**
 * Fetch purchase invoice lines for a specific invoice.
 * @param invoiceId The ID of the purchase invoice.
 */
async getPurchaseInvoiceLines(invoiceId: string): Promise<any[]> {
  const url = `${this.baseUrl()}/purchaseInvoices(${invoiceId})/purchaseInvoiceLines`;
  const params = {
    '$select': 'id,documentId,sequence,itemId,accountId,lineType,lineObjectNumber,description,description2,unitOfMeasureId,unitOfMeasureCode,unitCost,quantity,discountAmount,discountPercent,discountAppliedBeforeTax,amountExcludingTax,taxCode,taxPercent,totalTaxAmount,amountIncludingTax,invoiceDiscountAllocation,netAmount,netTaxAmount,netAmountIncludingTax,expectedReceiptDate,itemVariantId,locationId',
  };
  return await this.getRequest(url, params);
}

/**
 * Fetch purchase orders from the API with optional last sync date for incremental sync.
 */
async getPurchaseOrders(lastSyncDateTime?: Date): Promise<any[]> {
  const url = `${this.baseUrl()}/purchaseOrders`;
  const params: any = {
    '$select': 'id,number,orderDate,postingDate,vendorId,vendorNumber,vendorName,payToName,payToVendorId,payToVendorNumber,shipToName,shipToContact,buyFromAddressLine1,buyFromAddressLine2,buyFromCity,buyFromState,buyFromPostCode,buyFromCountry,payToAddressLine1,payToAddressLine2,payToCity,payToState,payToPostCode,payToCountry,shipToAddressLine1,shipToAddressLine2,shipToCity,shipToState,shipToPostCode,shipToCountry,shortcutDimension1Code,shortcutDimension2Code,currencyCode,pricesIncludeTax,paymentTermsId,shipmentMethodId,purchaser,requestedReceiptDate,discountAmount,discountAppliedBeforeTax,totalAmountExcludingTax,totalTaxAmount,totalAmountIncludingTax,fullyReceived,status,lastModifiedDateTime',
  };
  if (lastSyncDateTime) {
    params['$filter'] = `lastModifiedDateTime gt ${lastSyncDateTime.toISOString()}`;
  }
  return await this.getRequest(url, params);
}

/**
 * Fetch purchase order lines for a specific purchase order.
 * @param purchaseOrderId The ID of the purchase order.
 */
async getPurchaseOrderLines(purchaseOrderId: string): Promise<any[]> {
  const url = `${this.baseUrl()}/purchaseOrders(${purchaseOrderId})/purchaseOrderLines`;
  const params = {
    '$select':
      'id,documentId,sequence,itemId,accountId,lineType,lineObjectNumber,description,description2,' +
      'unitOfMeasureId,unitOfMeasureCode,quantity,directUnitCost,discountAmount,discountPercent,' +
      'discountAppliedBeforeTax,amountExcludingTax,taxCode,taxPercent,totalTaxAmount,' +
      'amountIncludingTax,invoiceDiscountAllocation,netAmount,netTaxAmount,netAmountIncludingTax,' +
      'expectedReceiptDate,receivedQuantity,invoicedQuantity,invoiceQuantity,receiveQuantity,' +
      'itemVariantId,locationId',
  };
  return await this.getRequest(url, params);
}

/**
 * Fetch purchase credit memos from the API with optional last sync date for incremental sync.
 */
async getPurchaseCreditMemos(lastSyncDateTime?: Date): Promise<any[]> {
  const url = `${this.baseUrl()}/purchaseCreditMemos`;
  const params: any = {
    '$select': 'id,number,creditMemoDate,postingDate,dueDate,vendorId,vendorNumber,vendorName,payToVendorId,payToVendorNumber,payToName,buyFromAddressLine1,buyFromAddressLine2,buyFromCity,buyFromState,buyFromPostCode,buyFromCountry,payToAddressLine1,payToAddressLine2,payToCity,payToState,payToPostCode,payToCountry,shortcutDimension1Code,shortcutDimension2Code,currencyCode,paymentTermsId,shipmentMethodId,purchaser,pricesIncludeTax,discountAmount,discountAppliedBeforeTax,totalAmountExcludingTax,totalTaxAmount,totalAmountIncludingTax,status,lastModifiedDateTime,invoiceId,invoiceNumber,vendorReturnReasonId',
  };
  if (lastSyncDateTime) {
    params['$filter'] = `lastModifiedDateTime gt ${lastSyncDateTime.toISOString()}`;
  }
  return await this.getRequest(url, params);
}

/**
 * Fetch purchase credit memo lines for a specific credit memo.
 * @param creditMemoId The ID of the purchase credit memo.
 */
async getPurchaseCreditMemoLines(creditMemoId: string): Promise<any[]> {
  const url = `${this.baseUrl()}/purchaseCreditMemos(${creditMemoId})/purchaseCreditMemoLines`;
  const params = {
    '$select': 'id,documentId,sequence,itemId,accountId,lineType,lineObjectNumber,description,unitOfMeasureId,unitOfMeasureCode,unitCost,quantity,discountAmount,discountPercent,discountAppliedBeforeTax,amountExcludingTax,taxCode,taxPercent,totalTaxAmount,amountIncludingTax,invoiceDiscountAllocation,netAmount,netTaxAmount,netAmountIncludingTax,itemVariantId,locationId',
  };
  return await this.getRequest(url, params);
}

  /**
   * Fetch general ledger entries from the API.
   * @param lastSyncDateTime The timestamp of the last successful synchronization.
   */
  async getGeneralLedgerEntries(lastSyncDateTime: Date): Promise<any[]> {
    const url = `${this.baseUrl()}/generalLedgerEntries`;
    const params = {
      '$select':
        'id,entryNumber,postingDate,documentNumber,documentType,accountId,accountNumber,description,debitAmount,creditAmount,additionalCurrencyDebitAmount,additionalCurrencyCreditAmount,lastModifiedDateTime',
      '$filter': `lastModifiedDateTime gt ${lastSyncDateTime.toISOString()}`,
    };
    return await this.getRequest(url, params);
  }

  /**
 * Fetch accounts from the API with optional last sync date for incremental sync.
 */
async getAccounts(lastSyncDateTime?: Date): Promise<any[]> {
  const url = `${this.baseUrl()}/accounts`;
  const params: any = {
    '$select': 'id,number,displayName,category,subCategory,blocked,accountType,directPosting,netChange,consolidationTranslationMethod,consolidationDebitAccount,consolidationCreditAccount,excludeFromConsolidation,lastModifiedDateTime',
  };
  if (lastSyncDateTime) {
    params['$filter'] = `lastModifiedDateTime gt ${lastSyncDateTime.toISOString()}`;
  }
  return await this.getRequest(url, params);
}

/**
 * Fetch bank accounts from the API with optional last sync date for incremental sync.
 */
async getBankAccounts(lastSyncDateTime?: Date): Promise<any[]> {
  const url = `${this.baseUrl()}/bankAccounts`;
  const params: any = {
    '$select': 'id,number,displayName,bankAccountNumber,blocked,currencyCode,currencyId,iban,intercompanyEnabled,lastModifiedDateTime',
  };
  if (lastSyncDateTime) {
    params['$filter'] = `lastModifiedDateTime gt ${lastSyncDateTime.toISOString()}`;
  }
  return await this.getRequest(url, params);
}

}