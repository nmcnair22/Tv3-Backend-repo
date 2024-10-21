// src/modules/sync/v2-api/v2-api.service.ts

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
  private async getRequest(url: string, params?: Record<string, string>): Promise<any[]> {
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
      if (error.response) {
        this.logger.error(`GET request to ${url} failed with status ${error.response.status}: ${error.response.statusText}`);
        this.logger.error(`Response Data: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        this.logger.error(`GET request to ${url} failed: No response received.`);
      } else {
        this.logger.error(`GET request to ${url} failed: ${error.message}`);
      }
      throw new HttpException(
        `Failed to fetch data from ${url}`,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Fetch customers from the API with specified fields.
   */
  async getCustomers(): Promise<any[]> {
    const url = `${this.baseUrl()}/customers`;
    const params = {
      '$select': 'id,number,displayName,addressLine1,addressLine2,city,state,postalCode,country,phoneNumber,email,website,balanceDue,creditLimit,taxRegistrationNumber,currencyCode,lastModifiedDateTime',
    };
    return await this.getRequest(url, params);
  }

  /**
   * Fetch vendors from the API with specified fields.
   */
  async getVendors(): Promise<any[]> {
    const url = `${this.baseUrl()}/vendors`;
    const params = {
      '$select': 'id,number,displayName,addressLine1,addressLine2,city,state,country,postalCode,phoneNumber,email,website,taxRegistrationNumber,currencyCode,irs1099Code,paymentTermsId,paymentMethodId,taxLiable,blocked,balance,lastModifiedDateTime',
    };
    return await this.getRequest(url, params);
  }

/**
 * Fetch items from the API.
 */
async getItems(): Promise<any[]> {
    const url = `${this.baseUrl()}/items`;
    const params = {
      '$select': 'id,number,displayName,displayName2,type,itemCategoryId,itemCategoryCode,blocked,gtin,inventory,unitPrice,priceIncludesTax,unitCost,taxGroupId,taxGroupCode,baseUnitOfMeasureId,baseUnitOfMeasureCode,generalProductPostingGroupId,generalProductPostingGroupCode,inventoryPostingGroupId,inventoryPostingGroupCode,lastModifiedDateTime',
    };
    return await this.getRequest(url, params);
  }

/**
 * Fetch sales invoices from the API.
 */
async getSalesInvoices(): Promise<any[]> {
    const url = `${this.baseUrl()}/salesInvoices`;
    const params = {
      '$select': 'id,number,externalDocumentNumber,invoiceDate,postingDate,dueDate,promisedPayDate,customerPurchaseOrderReference,customerId,customerNumber,customerName,billToName,billToCustomerId,billToCustomerNumber,shipToName,shipToContact,sellToAddressLine1,sellToAddressLine2,sellToCity,sellToState,sellToPostCode,sellToCountry,billToAddressLine1,billToAddressLine2,billToCity,billToState,billToPostCode,billToCountry,shipToAddressLine1,shipToAddressLine2,shipToCity,shipToState,shipToPostCode,shipToCountry,currencyCode,paymentTermsId,shipmentMethodId,salesperson,pricesIncludeTax,remainingAmount,discountAmount,discountAppliedBeforeTax,totalAmountExcludingTax,totalTaxAmount,totalAmountIncludingTax,status,lastModifiedDateTime,phoneNumber,email',
    };
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
 * Fetch sales credit memos from the API.
 */
async getSalesCreditMemos(): Promise<any[]> {
    const url = `${this.baseUrl()}/salesCreditMemos`;
    const params = {
      '$select': 'id,number,externalDocumentNumber,creditMemoDate,postingDate,dueDate,customerId,customerNumber,customerName,billToName,billToCustomerId,billToCustomerNumber,sellToAddressLine1,sellToAddressLine2,sellToCity,sellToState,sellToPostCode,sellToCountry,billToAddressLine1,billToAddressLine2,billToCity,billToState,billToPostCode,billToCountry,currencyCode,paymentTermsId,shipmentMethodId,salesperson,pricesIncludeTax,discountAmount,discountAppliedBeforeTax,totalAmountExcludingTax,totalTaxAmount,totalAmountIncludingTax,status,lastModifiedDateTime,invoiceId,invoiceNumber,phoneNumber,email,customerReturnReasonId',
    };
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
 * Fetch purchase invoices from the API.
 */
async getPurchaseInvoices(): Promise<any[]> {
    const url = `${this.baseUrl()}/purchaseInvoices`;
    const params = {
      '$select': 'id,number,postingDate,invoiceDate,dueDate,vendorInvoiceNumber,vendorId,vendorNumber,vendorName,payToName,payToContact,payToVendorId,payToVendorNumber,shipToName,shipToContact,buyFromAddressLine1,buyFromAddressLine2,buyFromCity,buyFromState,buyFromPostCode,buyFromCountry,shipToAddressLine1,shipToAddressLine2,shipToCity,shipToState,shipToPostCode,shipToCountry,payToAddressLine1,payToAddressLine2,payToCity,payToState,payToPostCode,payToCountry,currencyCode,orderId,orderNumber,purchaser,pricesIncludeTax,discountAmount,discountAppliedBeforeTax,totalAmountExcludingTax,totalTaxAmount,totalAmountIncludingTax,status,lastModifiedDateTime',
    };
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
 * Fetch purchase orders from the API.
 */
async getPurchaseOrders(): Promise<any[]> {
  const url = `${this.baseUrl()}/purchaseOrders`;
  const params = {
    '$select': 'id,number,orderDate,postingDate,vendorId,vendorNumber,vendorName,payToName,payToVendorId,payToVendorNumber,shipToName,shipToContact,buyFromAddressLine1,buyFromAddressLine2,buyFromCity,buyFromState,buyFromPostCode,buyFromCountry,payToAddressLine1,payToAddressLine2,payToCity,payToState,payToPostCode,payToCountry,shipToAddressLine1,shipToAddressLine2,shipToCity,shipToState,shipToPostCode,shipToCountry,shortcutDimension1Code,shortcutDimension2Code,currencyCode,pricesIncludeTax,paymentTermsId,shipmentMethodId,purchaser,requestedReceiptDate,discountAmount,discountAppliedBeforeTax,totalAmountExcludingTax,totalTaxAmount,totalAmountIncludingTax,fullyReceived,status,lastModifiedDateTime',
  };
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
 * Fetch purchase credit memos from the API.
 */
async getPurchaseCreditMemos(): Promise<any[]> {
  const url = `${this.baseUrl()}/purchaseCreditMemos`;
  const params = {
    '$select':
      'id,number,creditMemoDate,postingDate,dueDate,vendorId,vendorNumber,vendorName,payToVendorId,' +
      'payToVendorNumber,payToName,buyFromAddressLine1,buyFromAddressLine2,buyFromCity,' +
      'buyFromState,buyFromPostCode,buyFromCountry,payToAddressLine1,payToAddressLine2,payToCity,' +
      'payToState,payToPostCode,payToCountry,shortcutDimension1Code,shortcutDimension2Code,' +
      'currencyCode,paymentTermsId,shipmentMethodId,purchaser,pricesIncludeTax,' +
      'discountAmount,discountAppliedBeforeTax,totalAmountExcludingTax,totalTaxAmount,' +
      'totalAmountIncludingTax,status,lastModifiedDateTime,invoiceId,invoiceNumber,' +
      'vendorReturnReasonId',
  };
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
}