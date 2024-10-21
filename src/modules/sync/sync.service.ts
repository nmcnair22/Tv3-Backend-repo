// src/modules/sync/sync.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// Entity imports
import { Customer } from './entities/customer.entity';
import { Item } from './entities/item.entity';
import { PurchaseCreditMemoLine } from './entities/purchase-credit-memo-line.entity';
import { PurchaseCreditMemo } from './entities/purchase-credit-memo.entity';
import { PurchaseInvoiceLine } from './entities/purchase-invoice-line.entity';
import { PurchaseInvoice } from './entities/purchase-invoice.entity';
import { PurchaseOrderLine } from './entities/purchase-order-line.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { SalesCreditMemoLine } from './entities/sales-credit-memo-line.entity';
import { SalesCreditMemo } from './entities/sales-credit-memo.entity';
import { SalesInvoiceLine } from './entities/sales-invoice-line.entity';
import { SalesInvoice } from './entities/sales-invoice.entity';
import { Vendor } from './entities/vendor.entity';

// API Service imports
import { TmcApiService } from './tmc-api/tmc-api.service';
import { V2ApiService } from './v2-api/v2-api.service';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly v2ApiService: V2ApiService,
    private readonly tmcApiService: TmcApiService,

    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,

    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,

    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,

    @InjectRepository(SalesInvoice)
    private readonly salesInvoiceRepository: Repository<SalesInvoice>,

    @InjectRepository(SalesInvoiceLine)
    private readonly salesInvoiceLineRepository: Repository<SalesInvoiceLine>,

    @InjectRepository(SalesCreditMemo)
    private readonly salesCreditMemoRepository: Repository<SalesCreditMemo>,

    @InjectRepository(SalesCreditMemoLine)
    private readonly salesCreditMemoLineRepository: Repository<SalesCreditMemoLine>,

    @InjectRepository(PurchaseInvoice)
    private readonly purchaseInvoiceRepository: Repository<PurchaseInvoice>,

    @InjectRepository(PurchaseInvoiceLine)
    private readonly purchaseInvoiceLineRepository: Repository<PurchaseInvoiceLine>,

    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,

    @InjectRepository(PurchaseOrderLine)
    private readonly purchaseOrderLineRepository: Repository<PurchaseOrderLine>,

    @InjectRepository(PurchaseCreditMemo)
    private readonly purchaseCreditMemoRepository: Repository<PurchaseCreditMemo>,

    @InjectRepository(PurchaseCreditMemoLine)
    private readonly purchaseCreditMemoLineRepository: Repository<PurchaseCreditMemoLine>,
  ) {}

/**
 * Scheduled Cron Job to Synchronize Data
 */
@Cron('0 22 * * *')
async handleCron() {
  this.logger.debug('Starting scheduled synchronization...');
  await this.syncAll();
}

  /**
   * Synchronize All Data
   */
  async syncAll() {
    try {
      await this.syncCustomers();
      await this.syncVendors();
      await this.syncItems();
      await this.syncSalesInvoices();
      await this.syncSalesCreditMemos();
      await this.syncPurchaseInvoices();
      await this.syncPurchaseOrders();
      await this.syncPurchaseCreditMemos();
      // Call other sync methods for different entities
      this.logger.debug('Synchronization completed successfully.');
    } catch (error) {
      this.logger.error('Synchronization failed', error.stack);
    }
  }

  // ----------------------------------
  // Customer Synchronization
  // ----------------------------------
  async syncCustomers() {
    this.logger.debug('Synchronizing customers...');
    try {
      // Sync customers from V2 API
      const v2Customers = await this.v2ApiService.getCustomers(); // Corrected method name
      this.logger.debug(`Fetched ${v2Customers.length} customers from V2 API`);
      for (const v2Customer of v2Customers) {
        const customerEntity = this.transformV2Customer(v2Customer);
        await this.customerRepository.save(customerEntity);
        this.logger.debug(`Saved customer ${customerEntity.customerNumber} to database`);
      }

      // Sync customers from TMC API
      const tmcCustomers = await this.tmcApiService.getTmcCustomers(); // Correct method call
      if (!tmcCustomers || !Array.isArray(tmcCustomers)) {
        this.logger.error('TMC Customers data is undefined or not an array');
        throw new Error('Invalid data format from TMC API');
      }
      this.logger.debug(`Fetched ${tmcCustomers.length} customers from TMC API`);
      for (const tmcCustomer of tmcCustomers) {
        const customerEntity = this.transformTmcCustomer(tmcCustomer);
        await this.customerRepository.save(customerEntity);
        this.logger.debug(`Saved customer ${customerEntity.customerNumber} from TMC API to database`);
      }
    } catch (error) {
      this.logger.error('Error during customer synchronization', error.stack);
      throw error;
    }
  }

  private transformV2Customer(data: any): Customer {
    return this.customerRepository.create({
      id: data.id,
      customerNumber: data.number,
      displayName: data.displayName,
      additionalName: data.additionalName || null,
      addressLine1: data.addressLine1 || null,
      addressLine2: data.addressLine2 || null,
      city: data.city || null,
      state: data.state || null,
      postalCode: data.postalCode || null,
      country: data.country || null,
      phoneNumber: data.phoneNumber || null,
      email: data.email || null,
      website: data.website || null,
      balanceDue: data.balanceDue || 0,
      creditLimit: data.creditLimit || 0,
      taxRegistrationNumber: data.taxRegistrationNumber || null,
      currencyCode: data.currencyCode || null,
      lastModified: new Date(data.lastModifiedDateTime),
      apiSource: 'v2.0',
    });
  }

  private transformTmcCustomer(data: any): Customer {
    return this.customerRepository.create({
      id: data.systemId,
      customerNumber: data.no,
      displayName: data.name,
      additionalName: data.additionalName || null,
      addressLine1: data.addressLine1 || null,
      addressLine2: data.addressLine2 || null,
      city: data.city || null,
      state: data.state || null,
      postalCode: data.postCode || null,
      country: data.country || null,
      phoneNumber: data.phoneNo || null,
      email: data.email || null,
      website: data.homePage || null,
      balanceDue: data.balanceDue || 0, // If available
      creditLimit: data.creditLimit || 0, // If available
      taxRegistrationNumber: data.taxRegistrationNo || null,
      currencyCode: data.currencyCode || null, // If available
      lastModified: new Date(data.lastModifiedDateTime),
      apiSource: 'TMC',
    });
  }

  // ----------------------------------
  // Vendor Synchronization
  // ----------------------------------
  async syncVendors() {
    this.logger.debug('Synchronizing vendors...');
    try {
      const v2Vendors = await this.v2ApiService.getVendors(); // Corrected method name
      this.logger.debug(`Fetched ${v2Vendors.length} vendors from V2 API`);
      for (const v2Vendor of v2Vendors) {
        const vendorEntity = this.transformV2Vendor(v2Vendor);
        await this.vendorRepository.save(vendorEntity);
        this.logger.debug(`Saved vendor ${vendorEntity.vendorNumber} to database`);
      }
      // Add TMC vendor synchronization if applicable
    } catch (error) {
      this.logger.error('Error during vendor synchronization', error.stack);
      throw error;
    }
  }

  private transformV2Vendor(data: any): Vendor {
    return this.vendorRepository.create({
      id: data.id,
      vendorNumber: data.number,
      displayName: data.displayName,
      addressLine1: data.addressLine1 || null,
      addressLine2: data.addressLine2 || null,
      city: data.city || null,
      state: data.state || null,
      postalCode: data.postalCode || null,
      country: data.country || null,
      phoneNumber: data.phoneNumber || null,
      email: data.email || null,
      website: data.website || null,
      taxRegistrationNumber: data.taxRegistrationNumber || null,
      currencyCode: data.currencyCode || null,
      irs1099Code: data.irs1099Code || null,
      paymentTermsId: data.paymentTermsId !== '00000000-0000-0000-0000-000000000000' ? data.paymentTermsId : null,
      paymentMethodId: data.paymentMethodId !== '00000000-0000-0000-0000-000000000000' ? data.paymentMethodId : null,
      taxLiable: data.taxLiable,
      blocked: data.blocked,
      balance: data.balance || 0,
      lastModified: new Date(data.lastModifiedDateTime),
      apiSource: 'v2.0',
    });
  }

  // ----------------------------------
  // Item Synchronization
  // ----------------------------------
  async syncItems() {
    this.logger.debug('Synchronizing items...');
    try {
      const v2Items = await this.v2ApiService.getItems(); // Corrected method name
      this.logger.debug(`Fetched ${v2Items.length} items from V2 API`);
      for (const v2Item of v2Items) {
        const itemEntity = this.transformV2Item(v2Item);
        await this.itemRepository.save(itemEntity);
        this.logger.debug(`Saved item ${itemEntity.itemNo} to database`);
      }
      // Add TMC item synchronization if applicable
    } catch (error) {
      this.logger.error('Error during item synchronization', error.stack);
      throw error;
    }
  }

  private transformV2Item(data: any): Item {
    return this.itemRepository.create({
      id: data.id,
      itemNo: data.number,
      displayName: data.displayName,
      displayName2: data.displayName2 || null,
      type: data.type,
      itemCategoryId: data.itemCategoryId !== '00000000-0000-0000-0000-000000000000' ? data.itemCategoryId : null,
      itemCategoryCode: data.itemCategoryCode || null,
      blocked: data.blocked,
      gtin: data.gtin || null,
      inventory: data.inventory,
      unitPrice: data.unitPrice,
      priceIncludesTax: data.priceIncludesTax,
      unitCost: data.unitCost,
      taxGroupId: data.taxGroupId !== '00000000-0000-0000-0000-000000000000' ? data.taxGroupId : null,
      taxGroupCode: data.taxGroupCode || null,
      baseUnitOfMeasureId: data.baseUnitOfMeasureId !== '00000000-0000-0000-0000-000000000000' ? data.baseUnitOfMeasureId : null,
      baseUnitOfMeasureCode: data.baseUnitOfMeasureCode || null,
      generalProductPostingGroupId: data.generalProductPostingGroupId !== '00000000-0000-0000-0000-000000000000' ? data.generalProductPostingGroupId : null,
      generalProductPostingGroupCode: data.generalProductPostingGroupCode || null,
      inventoryPostingGroupId: data.inventoryPostingGroupId !== '00000000-0000-0000-0000-000000000000' ? data.inventoryPostingGroupId : null,
      inventoryPostingGroupCode: data.inventoryPostingGroupCode || null,
      lastModified: new Date(data.lastModifiedDateTime),
      apiSource: 'v2.0',
    });
  }

  // ----------------------------------
  // Sales Invoice Synchronization
  // ----------------------------------
  async syncSalesInvoices() {
    this.logger.debug('Synchronizing sales invoices...');
    try {
      const v2SalesInvoices = await this.v2ApiService.getSalesInvoices();
      this.logger.debug(`Fetched ${v2SalesInvoices.length} sales invoices from V2 API`);
      for (const v2Invoice of v2SalesInvoices) {
        const invoiceEntity = this.transformV2SalesInvoice(v2Invoice);
        await this.salesInvoiceRepository.save(invoiceEntity);
        this.logger.debug(`Saved sales invoice ${invoiceEntity.invoiceNumber} to database`);
  
        // Fetch and sync sales invoice lines
        const v2InvoiceLines = await this.v2ApiService.getSalesInvoiceLines(v2Invoice.id);
        this.logger.debug(`Fetched ${v2InvoiceLines.length} sales invoice lines from V2 API`);
        for (const v2Line of v2InvoiceLines) {
          const lineEntity = this.transformV2SalesInvoiceLine(v2Line, invoiceEntity.id);
          await this.salesInvoiceLineRepository.save(lineEntity);
          this.logger.debug(`Saved sales invoice line ${lineEntity.id} to database`);
        }
      }
    } catch (error) {
      this.logger.error('Error during sales invoice synchronization', error.stack);
      throw error;
    }
  }

  private transformV2SalesInvoice(data: any): SalesInvoice {
    return this.salesInvoiceRepository.create({
      id: data.id,
      invoiceNumber: data.number,
      externalDocumentNumber: data.externalDocumentNumber || null,
      invoiceDate: new Date(data.invoiceDate),
      postingDate: new Date(data.postingDate),
      dueDate: new Date(data.dueDate),
      promisedPayDate:
        data.promisedPayDate && data.promisedPayDate !== '0001-01-01'
          ? new Date(data.promisedPayDate)
          : null,
      customerPurchaseOrderReference: data.customerPurchaseOrderReference || null,
      customerId: data.customerId,
      customerNumber: data.customerNumber,
      customerName: data.customerName,
      billToName: data.billToName || null,
      billToCustomerId:
        data.billToCustomerId !== '00000000-0000-0000-0000-000000000000'
          ? data.billToCustomerId
          : null,
      billToCustomerNumber: data.billToCustomerNumber || null,
      shipToName: data.shipToName || null,
      shipToContact: data.shipToContact || null,
      sellToAddressLine1: data.sellToAddressLine1 || null,
      sellToAddressLine2: data.sellToAddressLine2 || null,
      sellToCity: data.sellToCity || null,
      sellToState: data.sellToState || null,
      sellToPostCode: data.sellToPostCode || null,
      sellToCountry: data.sellToCountry || null,
      billToAddressLine1: data.billToAddressLine1 || null,
      billToAddressLine2: data.billToAddressLine2 || null,
      billToCity: data.billToCity || null,
      billToState: data.billToState || null,
      billToPostCode: data.billToPostCode || null,
      billToCountry: data.billToCountry || null,
      shipToAddressLine1: data.shipToAddressLine1 || null,
      shipToAddressLine2: data.shipToAddressLine2 || null,
      shipToCity: data.shipToCity || null,
      shipToState: data.shipToState || null,
      shipToPostCode: data.shipToPostCode || null,
      shipToCountry: data.shipToCountry || null,
      currencyCode: data.currencyCode || null,
      paymentTermsId:
        data.paymentTermsId !== '00000000-0000-0000-0000-000000000000'
          ? data.paymentTermsId
          : null,
      shipmentMethodId:
        data.shipmentMethodId !== '00000000-0000-0000-0000-000000000000'
          ? data.shipmentMethodId
          : null,
      salesperson: data.salesperson || null,
      pricesIncludeTax: data.pricesIncludeTax,
      remainingAmount: data.remainingAmount,
      discountAmount: data.discountAmount,
      discountAppliedBeforeTax: data.discountAppliedBeforeTax,
      totalAmountExcludingTax: data.totalAmountExcludingTax,
      totalTaxAmount: data.totalTaxAmount,
      totalAmountIncludingTax: data.totalAmountIncludingTax,
      status: data.status,
      lastModified: new Date(data.lastModifiedDateTime),
      phoneNumber: data.phoneNumber || null,
      email: data.email || null,
      apiSource: 'v2.0',
    });
  }

  private transformV2SalesInvoiceLine(data: any, salesInvoiceId: string): SalesInvoiceLine {
    // Log the discountPercent value for debugging purposes
    console.log(
      `Processing Sales Invoice Line ID: ${data.id}, Discount Percent: ${data.discountPercent}`
    );
  
    // Handle and validate the discountPercent value
    let discountPercent = data.discountPercent;
  
    // Ensure discountPercent is a number
    if (typeof discountPercent !== 'number' || isNaN(discountPercent)) {
      this.logger.warn(
        `Invalid discount percent value for line ${data.id}. Setting discountPercent to 0.`
      );
      discountPercent = 0;
    }
  
    // If discountPercent is a decimal fraction between 0 and 1, convert it to percentage
    if (discountPercent > 0 && discountPercent < 1) {
      discountPercent = discountPercent * 100;
    }
  
    // Round discountPercent to two decimal places
    discountPercent = Math.round(discountPercent * 100) / 100;
  
    // Ensure discountPercent is within a valid range (0% to 100%)
    if (discountPercent > 100) {
      this.logger.warn(
        `Discount percent ${discountPercent}% exceeds 100% for line ${data.id}. Capping at 100%.`
      );
      discountPercent = 100;
    } else if (discountPercent < 0) {
      this.logger.warn(
        `Negative discount percent ${discountPercent}% for line ${data.id}. Setting to 0%.`
      );
      discountPercent = 0;
    }
  
    // Adjust the precision and scale in your entity if necessary (e.g., decimal(7,2))
    // Ensure the discountPercent column in your database has sufficient precision and scale
  
    return this.salesInvoiceLineRepository.create({
      id: data.id,
      salesInvoiceId: salesInvoiceId,
      sequence: data.sequence,
      itemId:
        data.itemId !== '00000000-0000-0000-0000-000000000000' ? data.itemId : null,
      accountId:
        data.accountId !== '00000000-0000-0000-0000-000000000000' ? data.accountId : null,
      lineType: data.lineType,
      lineObjectNumber: data.lineObjectNumber || null,
      description: data.description || null,
      description2: data.description2 || null,
      unitOfMeasureId:
        data.unitOfMeasureId !== '00000000-0000-0000-0000-000000000000'
          ? data.unitOfMeasureId
          : null,
      unitOfMeasureCode: data.unitOfMeasureCode || null,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      discountAmount: data.discountAmount,
      discountPercent: discountPercent, // Use the validated and adjusted discountPercent
      discountAppliedBeforeTax: data.discountAppliedBeforeTax,
      amountExcludingTax: data.amountExcludingTax,
      taxCode: data.taxCode || null,
      taxPercent: data.taxPercent,
      totalTaxAmount: data.totalTaxAmount,
      amountIncludingTax: data.amountIncludingTax,
      invoiceDiscountAllocation: data.invoiceDiscountAllocation,
      netAmount: data.netAmount,
      netTaxAmount: data.netTaxAmount,
      netAmountIncludingTax: data.netAmountIncludingTax,
      shipmentDate: data.shipmentDate ? new Date(data.shipmentDate) : null,
      itemVariantId:
        data.itemVariantId !== '00000000-0000-0000-0000-000000000000'
          ? data.itemVariantId
          : null,
      locationId:
        data.locationId !== '00000000-0000-0000-0000-000000000000' ? data.locationId : null,
      apiSource: 'v2.0',
    });
  }

  // ----------------------------------
  // Sales Credit Memo Synchronization
  // ----------------------------------
  async syncSalesCreditMemos() {
    this.logger.debug('Synchronizing sales credit memos...');
    try {
      const v2CreditMemos = await this.v2ApiService.getSalesCreditMemos();
      this.logger.debug(`Fetched ${v2CreditMemos.length} sales credit memos from V2 API`);
      for (const v2Memo of v2CreditMemos) {
        const memoEntity = this.transformV2SalesCreditMemo(v2Memo);
        await this.salesCreditMemoRepository.save(memoEntity);
        this.logger.debug(`Saved sales credit memo ${memoEntity.number} to database`);
  
        // Fetch and sync sales credit memo lines
        const v2MemoLines = await this.v2ApiService.getSalesCreditMemoLines(v2Memo.id);
        this.logger.debug(`Fetched ${v2MemoLines.length} sales credit memo lines from V2 API`);
        for (const v2Line of v2MemoLines) {
          const lineEntity = this.transformV2SalesCreditMemoLine(v2Line, memoEntity.id);
          await this.salesCreditMemoLineRepository.save(lineEntity);
          this.logger.debug(`Saved sales credit memo line ${lineEntity.id} to database`);
        }
      }
    } catch (error) {
      this.logger.error('Error during sales credit memo synchronization', error.stack);
      throw error;
    }
  }

  private transformV2SalesCreditMemo(data: any): SalesCreditMemo {
    return this.salesCreditMemoRepository.create({
      id: data.id,
      number: data.number,
      externalDocumentNumber: data.externalDocumentNumber || null,
      creditMemoDate: new Date(data.creditMemoDate),
      postingDate: new Date(data.postingDate),
      dueDate: new Date(data.dueDate),
      customerId: data.customerId,
      customerNumber: data.customerNumber,
      customerName: data.customerName,
      billToName: data.billToName || null,
      billToCustomerId:
        data.billToCustomerId !== '00000000-0000-0000-0000-000000000000'
          ? data.billToCustomerId
          : null,
      billToCustomerNumber: data.billToCustomerNumber || null,
      sellToAddressLine1: data.sellToAddressLine1 || null,
      sellToAddressLine2: data.sellToAddressLine2 || null,
      sellToCity: data.sellToCity || null,
      sellToState: data.sellToState || null,
      sellToPostCode: data.sellToPostCode || null,
      sellToCountry: data.sellToCountry || null,
      billToAddressLine1: data.billToAddressLine1 || null,
      billToAddressLine2: data.billToAddressLine2 || null,
      billToCity: data.billToCity || null,
      billToState: data.billToState || null,
      billToPostCode: data.billToPostCode || null,
      billToCountry: data.billToCountry || null,
      currencyCode: data.currencyCode || null,
      paymentTermsId:
        data.paymentTermsId !== '00000000-0000-0000-0000-000000000000'
          ? data.paymentTermsId
          : null,
      shipmentMethodId:
        data.shipmentMethodId !== '00000000-0000-0000-0000-000000000000'
          ? data.shipmentMethodId
          : null,
      salesperson: data.salesperson || null,
      pricesIncludeTax: data.pricesIncludeTax,
      discountAmount: data.discountAmount,
      discountAppliedBeforeTax: data.discountAppliedBeforeTax,
      totalAmountExcludingTax: data.totalAmountExcludingTax,
      totalTaxAmount: data.totalTaxAmount,
      totalAmountIncludingTax: data.totalAmountIncludingTax,
      status: data.status,
      lastModified: new Date(data.lastModifiedDateTime),
      invoiceId:
        data.invoiceId !== '00000000-0000-0000-0000-000000000000'
          ? data.invoiceId
          : null,
      invoiceNumber: data.invoiceNumber || null,
      phoneNumber: data.phoneNumber || null,
      email: data.email || null,
      customerReturnReasonId:
        data.customerReturnReasonId !== '00000000-0000-0000-0000-000000000000'
          ? data.customerReturnReasonId
          : null,
      apiSource: 'v2.0',
    });
  }

  private transformV2SalesCreditMemoLine(
    data: any,
    salesCreditMemoId: string
  ): SalesCreditMemoLine {
    // Log the discountPercent value for debugging purposes
    console.log(
      `Processing Sales Credit Memo Line ID: ${data.id}, Discount Percent: ${data.discountPercent}`
    );
  
    // Handle and validate the discountPercent value
    let discountPercent = data.discountPercent;
  
    // Ensure discountPercent is a number
    if (typeof discountPercent !== 'number' || isNaN(discountPercent)) {
      this.logger.warn(
        `Invalid discount percent value for line ${data.id}. Setting discountPercent to 0.`
      );
      discountPercent = 0;
    }
  
    // If discountPercent is a decimal fraction between 0 and 1, convert it to percentage
    if (discountPercent > 0 && discountPercent < 1) {
      discountPercent = discountPercent * 100;
    }
  
    // Round discountPercent to two decimal places
    discountPercent = Math.round(discountPercent * 100) / 100;
  
    // Ensure discountPercent is within a valid range (0% to 100%)
    if (discountPercent > 100) {
      this.logger.warn(
        `Discount percent ${discountPercent}% exceeds 100% for line ${data.id}. Capping at 100%.`
      );
      discountPercent = 100;
    } else if (discountPercent < 0) {
      this.logger.warn(
        `Negative discount percent ${discountPercent}% for line ${data.id}. Setting to 0%.`
      );
      discountPercent = 0;
    }
  
    return this.salesCreditMemoLineRepository.create({
      id: data.id,
      salesCreditMemoId: salesCreditMemoId,
      sequence: data.sequence,
      itemId:
        data.itemId !== '00000000-0000-0000-0000-000000000000'
          ? data.itemId
          : null,
      accountId:
        data.accountId !== '00000000-0000-0000-0000-000000000000'
          ? data.accountId
          : null,
      lineType: data.lineType,
      lineObjectNumber: data.lineObjectNumber || null,
      description: data.description || null,
      description2: data.description2 || null,
      unitOfMeasureId:
        data.unitOfMeasureId !== '00000000-0000-0000-0000-000000000000'
          ? data.unitOfMeasureId
          : null,
      unitOfMeasureCode: data.unitOfMeasureCode || null,
      unitPrice: data.unitPrice,
      quantity: data.quantity,
      discountAmount: data.discountAmount,
      discountPercent: discountPercent, // Use the validated and adjusted discountPercent
      discountAppliedBeforeTax: data.discountAppliedBeforeTax,
      amountExcludingTax: data.amountExcludingTax,
      taxCode: data.taxCode || null,
      taxPercent: data.taxPercent,
      totalTaxAmount: data.totalTaxAmount,
      amountIncludingTax: data.amountIncludingTax,
      invoiceDiscountAllocation: data.invoiceDiscountAllocation,
      netAmount: data.netAmount,
      netTaxAmount: data.netTaxAmount,
      netAmountIncludingTax: data.netAmountIncludingTax,
      // Remove 'expectedReceiptDate' if it's not a valid property for SalesCreditMemoLine
      // If it's valid, make sure it's defined in the entity and adjust accordingly:
      // expectedReceiptDate:
      //   data.expectedReceiptDate && data.expectedReceiptDate !== '0001-01-01'
      //     ? new Date(data.expectedReceiptDate)
      //     : null,
      itemVariantId:
        data.itemVariantId !== '00000000-0000-0000-0000-000000000000'
          ? data.itemVariantId
          : null,
      locationId:
        data.locationId !== '00000000-0000-0000-0000-000000000000'
          ? data.locationId
          : null,
      apiSource: 'v2.0',
    });
  }

  // ----------------------------------
  // Purchase Invoice Synchronization
  // ----------------------------------
  async syncPurchaseInvoices() {
    this.logger.debug('Synchronizing purchase invoices...');
    try {
      const v2PurchaseInvoices = await this.v2ApiService.getPurchaseInvoices();
      this.logger.debug(`Fetched ${v2PurchaseInvoices.length} purchase invoices from V2 API`);
      for (const v2Invoice of v2PurchaseInvoices) {
        const invoiceEntity = this.transformV2PurchaseInvoice(v2Invoice);
        await this.purchaseInvoiceRepository.save(invoiceEntity);
        this.logger.debug(`Saved purchase invoice ${invoiceEntity.number} to database`);
  
        // Fetch and sync purchase invoice lines
        const v2InvoiceLines = await this.v2ApiService.getPurchaseInvoiceLines(v2Invoice.id);
        this.logger.debug(`Fetched ${v2InvoiceLines.length} purchase invoice lines from V2 API`);
        for (const v2Line of v2InvoiceLines) {
          const lineEntity = this.transformV2PurchaseInvoiceLine(v2Line, invoiceEntity.id);
          await this.purchaseInvoiceLineRepository.save(lineEntity);
          this.logger.debug(`Saved purchase invoice line ${lineEntity.id} to database`);
        }
      }
    } catch (error) {
      this.logger.error('Error during purchase invoice synchronization', error.stack);
      throw error;
    }
  }

  private transformV2PurchaseInvoice(data: any): PurchaseInvoice {
    return this.purchaseInvoiceRepository.create({
      id: data.id,
      number: data.number,
      postingDate: new Date(data.postingDate),
      invoiceDate: new Date(data.invoiceDate),
      dueDate: new Date(data.dueDate),
      vendorInvoiceNumber: data.vendorInvoiceNumber || null,
      vendorId: data.vendorId,
      vendorNumber: data.vendorNumber,
      vendorName: data.vendorName,
      payToName: data.payToName || null,
      payToContact: data.payToContact || null,
      payToVendorId: data.payToVendorId !== '00000000-0000-0000-0000-000000000000' ? data.payToVendorId : null,
      payToVendorNumber: data.payToVendorNumber || null,
      shipToName: data.shipToName || null,
      shipToContact: data.shipToContact || null,
      buyFromAddressLine1: data.buyFromAddressLine1 || null,
      buyFromAddressLine2: data.buyFromAddressLine2 || null,
      buyFromCity: data.buyFromCity || null,
      buyFromState: data.buyFromState || null,
      buyFromPostCode: data.buyFromPostCode || null,
      buyFromCountry: data.buyFromCountry || null,
      shipToAddressLine1: data.shipToAddressLine1 || null,
      shipToAddressLine2: data.shipToAddressLine2 || null,
      shipToCity: data.shipToCity || null,
      shipToState: data.shipToState || null,
      shipToPostCode: data.shipToPostCode || null,
      shipToCountry: data.shipToCountry || null,
      payToAddressLine1: data.payToAddressLine1 || null,
      payToAddressLine2: data.payToAddressLine2 || null,
      payToCity: data.payToCity || null,
      payToState: data.payToState || null,
      payToPostCode: data.payToPostCode || null,
      payToCountry: data.payToCountry || null,
      currencyCode: data.currencyCode || null,
      orderId: data.orderId !== '00000000-0000-0000-0000-000000000000' ? data.orderId : null,
      orderNumber: data.orderNumber || null,
      purchaser: data.purchaser || null,
      pricesIncludeTax: data.pricesIncludeTax,
      discountAmount: data.discountAmount,
      discountAppliedBeforeTax: data.discountAppliedBeforeTax,
      totalAmountExcludingTax: data.totalAmountExcludingTax,
      totalTaxAmount: data.totalTaxAmount,
      totalAmountIncludingTax: data.totalAmountIncludingTax,
      status: data.status,
      lastModified: new Date(data.lastModifiedDateTime),
      apiSource: 'v2.0',
    });
  }

  private transformV2PurchaseInvoiceLine(data: any, purchaseInvoiceId: string): PurchaseInvoiceLine {
    return this.purchaseInvoiceLineRepository.create({
      id: data.id,
      purchaseInvoiceId: purchaseInvoiceId,
      sequence: data.sequence,
      itemId: data.itemId !== '00000000-0000-0000-0000-000000000000' ? data.itemId : null,
      accountId: data.accountId !== '00000000-0000-0000-0000-000000000000' ? data.accountId : null,
      lineType: data.lineType,
      lineObjectNumber: data.lineObjectNumber || null,
      description: data.description || null,
      description2: data.description2 || null,
      unitOfMeasureId: data.unitOfMeasureId !== '00000000-0000-0000-0000-000000000000' ? data.unitOfMeasureId : null,
      unitOfMeasureCode: data.unitOfMeasureCode || null,
      unitCost: data.unitCost,
      quantity: data.quantity,
      discountAmount: data.discountAmount,
      discountPercent: data.discountPercent,
      discountAppliedBeforeTax: data.discountAppliedBeforeTax,
      amountExcludingTax: data.amountExcludingTax,
      taxCode: data.taxCode || null,
      taxPercent: data.taxPercent,
      totalTaxAmount: data.totalTaxAmount,
      amountIncludingTax: data.amountIncludingTax,
      invoiceDiscountAllocation: data.invoiceDiscountAllocation,
      netAmount: data.netAmount,
      netTaxAmount: data.netTaxAmount,
      netAmountIncludingTax: data.netAmountIncludingTax,
      expectedReceiptDate: data.expectedReceiptDate ? new Date(data.expectedReceiptDate) : null,
      itemVariantId: data.itemVariantId !== '00000000-0000-0000-0000-000000000000' ? data.itemVariantId : null,
      locationId: data.locationId !== '00000000-0000-0000-0000-000000000000' ? data.locationId : null,
      apiSource: 'v2.0',
    });
  }

  // ----------------------------------
  // Purchase Order Synchronization
  // ----------------------------------
  async syncPurchaseOrders() {
    this.logger.debug('Synchronizing purchase orders...');
    try {
      const v2PurchaseOrders = await this.v2ApiService.getPurchaseOrders();
      this.logger.debug(`Fetched ${v2PurchaseOrders.length} purchase orders from V2 API`);
      for (const v2Order of v2PurchaseOrders) {
        const orderEntity = this.transformV2PurchaseOrder(v2Order);
        await this.purchaseOrderRepository.save(orderEntity);
        this.logger.debug(`Saved purchase order ${orderEntity.number} to database`);
  
        // Fetch and sync purchase order lines
        const v2OrderLines = await this.v2ApiService.getPurchaseOrderLines(v2Order.id);
        this.logger.debug(`Fetched ${v2OrderLines.length} purchase order lines from V2 API`);
        for (const v2Line of v2OrderLines) {
          const lineEntity = this.transformV2PurchaseOrderLine(v2Line, orderEntity.id);
          await this.purchaseOrderLineRepository.save(lineEntity);
          this.logger.debug(`Saved purchase order line ${lineEntity.id} to database`);
        }
      }
    } catch (error) {
      this.logger.error('Error during purchase order synchronization', error.stack);
      throw error;
    }
  }

  private transformV2PurchaseOrder(data: any): PurchaseOrder {
    return this.purchaseOrderRepository.create({
      id: data.id,
      number: data.number,
      orderDate: new Date(data.orderDate),
      postingDate: new Date(data.postingDate),
      vendorId: data.vendorId,
      vendorNumber: data.vendorNumber,
      vendorName: data.vendorName,
      payToName: data.payToName || null,
      payToVendorId: data.payToVendorId !== '00000000-0000-0000-0000-000000000000' ? data.payToVendorId : null,
      payToVendorNumber: data.payToVendorNumber || null,
      shipToName: data.shipToName || null,
      shipToContact: data.shipToContact || null,
      buyFromAddressLine1: data.buyFromAddressLine1 || null,
      buyFromAddressLine2: data.buyFromAddressLine2 || null,
      buyFromCity: data.buyFromCity || null,
      buyFromState: data.buyFromState || null,
      buyFromPostCode: data.buyFromPostCode || null,
      buyFromCountry: data.buyFromCountry || null,
      payToAddressLine1: data.payToAddressLine1 || null,
      payToAddressLine2: data.payToAddressLine2 || null,
      payToCity: data.payToCity || null,
      payToState: data.payToState || null,
      payToPostCode: data.payToPostCode || null,
      payToCountry: data.payToCountry || null,
      shipToAddressLine1: data.shipToAddressLine1 || null,
      shipToAddressLine2: data.shipToAddressLine2 || null,
      shipToCity: data.shipToCity || null,
      shipToState: data.shipToState || null,
      shipToPostCode: data.shipToPostCode || null,
      shipToCountry: data.shipToCountry || null,
      shortcutDimension1Code: data.shortcutDimension1Code || null,
      shortcutDimension2Code: data.shortcutDimension2Code || null,
      currencyCode: data.currencyCode || null,
      pricesIncludeTax: data.pricesIncludeTax,
      paymentTermsId: data.paymentTermsId !== '00000000-0000-0000-0000-000000000000' ? data.paymentTermsId : null,
      shipmentMethodId: data.shipmentMethodId !== '00000000-0000-0000-0000-000000000000' ? data.shipmentMethodId : null,
      purchaser: data.purchaser || null,
      requestedReceiptDate: data.requestedReceiptDate && data.requestedReceiptDate !== '0001-01-01' ? new Date(data.requestedReceiptDate) : null,
      discountAmount: data.discountAmount,
      discountAppliedBeforeTax: data.discountAppliedBeforeTax,
      totalAmountExcludingTax: data.totalAmountExcludingTax,
      totalTaxAmount: data.totalTaxAmount,
      totalAmountIncludingTax: data.totalAmountIncludingTax,
      fullyReceived: data.fullyReceived,
      status: data.status,
      lastModified: new Date(data.lastModifiedDateTime),
      apiSource: 'v2.0',
    });
  }

  private transformV2PurchaseOrderLine(data: any, purchaseOrderId: string): PurchaseOrderLine {
    return this.purchaseOrderLineRepository.create({
      id: data.id,
      purchaseOrderId: purchaseOrderId,
      sequence: data.sequence,
      itemId: data.itemId !== '00000000-0000-0000-0000-000000000000' ? data.itemId : null,
      accountId: data.accountId !== '00000000-0000-0000-0000-000000000000' ? data.accountId : null,
      lineType: data.lineType,
      lineObjectNumber: data.lineObjectNumber || null,
      description: data.description || null,
      description2: data.description2 || null,
      unitOfMeasureId: data.unitOfMeasureId !== '00000000-0000-0000-0000-000000000000' ? data.unitOfMeasureId : null,
      unitOfMeasureCode: data.unitOfMeasureCode || null,
      quantity: data.quantity,
      directUnitCost: data.directUnitCost,
      discountAmount: data.discountAmount,
      discountPercent: data.discountPercent,
      discountAppliedBeforeTax: data.discountAppliedBeforeTax,
      amountExcludingTax: data.amountExcludingTax,
      taxCode: data.taxCode || null,
      taxPercent: data.taxPercent,
      totalTaxAmount: data.totalTaxAmount,
      amountIncludingTax: data.amountIncludingTax,
      invoiceDiscountAllocation: data.invoiceDiscountAllocation,
      netAmount: data.netAmount,
      netTaxAmount: data.netTaxAmount,
      netAmountIncludingTax: data.netAmountIncludingTax,
      expectedReceiptDate: data.expectedReceiptDate ? new Date(data.expectedReceiptDate) : null,
      receivedQuantity: data.receivedQuantity,
      invoicedQuantity: data.invoicedQuantity,
      invoiceQuantity: data.invoiceQuantity,
      receiveQuantity: data.receiveQuantity,
      itemVariantId: data.itemVariantId !== '00000000-0000-0000-0000-000000000000' ? data.itemVariantId : null,
      locationId: data.locationId !== '00000000-0000-0000-0000-000000000000' ? data.locationId : null,
      apiSource: 'v2.0',
    });
  }

  // ----------------------------------
  // Purchase Credit Memo Synchronization
  // ----------------------------------
  async syncPurchaseCreditMemos() {
    this.logger.debug('Synchronizing purchase credit memos...');
    try {
      const v2CreditMemos = await this.v2ApiService.getPurchaseCreditMemos();
      this.logger.debug(`Fetched ${v2CreditMemos.length} purchase credit memos from V2 API`);
      for (const v2Memo of v2CreditMemos) {
        const memoEntity = this.transformV2PurchaseCreditMemo(v2Memo);
        await this.purchaseCreditMemoRepository.save(memoEntity);
        this.logger.debug(`Saved purchase credit memo ${memoEntity.number} to database`);
  
        // Fetch and sync purchase credit memo lines
        const v2MemoLines = await this.v2ApiService.getPurchaseCreditMemoLines(v2Memo.id);
        this.logger.debug(`Fetched ${v2MemoLines.length} purchase credit memo lines from V2 API`);
        for (const v2Line of v2MemoLines) {
          const lineEntity = this.transformV2PurchaseCreditMemoLine(v2Line, memoEntity.id);
          await this.purchaseCreditMemoLineRepository.save(lineEntity);
          this.logger.debug(`Saved purchase credit memo line ${lineEntity.id} to database`);
        }
      }
    } catch (error) {
      this.logger.error('Error during purchase credit memo synchronization', error.stack);
      throw error;
    }
  }

  private transformV2PurchaseCreditMemo(data: any): PurchaseCreditMemo {
    return this.purchaseCreditMemoRepository.create({
      id: data.id,
      number: data.number,
      creditMemoDate: new Date(data.creditMemoDate),
      postingDate: new Date(data.postingDate),
      dueDate: new Date(data.dueDate),
      vendorId: data.vendorId,
      vendorNumber: data.vendorNumber,
      vendorName: data.vendorName,
      payToVendorId: data.payToVendorId !== '00000000-0000-0000-0000-000000000000' ? data.payToVendorId : null,
      payToVendorNumber: data.payToVendorNumber || null,
      payToName: data.payToName || null,
      buyFromAddressLine1: data.buyFromAddressLine1 || null,
      buyFromAddressLine2: data.buyFromAddressLine2 || null,
      buyFromCity: data.buyFromCity || null,
      buyFromState: data.buyFromState || null,
      buyFromPostCode: data.buyFromPostCode || null,
      buyFromCountry: data.buyFromCountry || null,
      payToAddressLine1: data.payToAddressLine1 || null,
      payToAddressLine2: data.payToAddressLine2 || null,
      payToCity: data.payToCity || null,
      payToState: data.payToState || null,
      payToPostCode: data.payToPostCode || null,
      payToCountry: data.payToCountry || null,
      shortcutDimension1Code: data.shortcutDimension1Code || null,
      shortcutDimension2Code: data.shortcutDimension2Code || null,
      currencyCode: data.currencyCode || null,
      // Removed currencyId and related properties
      paymentTermsId: data.paymentTermsId !== '00000000-0000-0000-0000-000000000000' ? data.paymentTermsId : null,
      shipmentMethodId: data.shipmentMethodId !== '00000000-0000-0000-0000-000000000000' ? data.shipmentMethodId : null,
      purchaser: data.purchaser || null,
      pricesIncludeTax: data.pricesIncludeTax,
      discountAmount: data.discountAmount,
      discountAppliedBeforeTax: data.discountAppliedBeforeTax,
      totalAmountExcludingTax: data.totalAmountExcludingTax,
      totalTaxAmount: data.totalTaxAmount,
      totalAmountIncludingTax: data.totalAmountIncludingTax,
      status: data.status,
      lastModified: new Date(data.lastModifiedDateTime),
      invoiceId: data.invoiceId !== '00000000-0000-0000-0000-000000000000' ? data.invoiceId : null,
      invoiceNumber: data.invoiceNumber || null,
      vendorReturnReasonId: data.vendorReturnReasonId !== '00000000-0000-0000-0000-000000000000' ? data.vendorReturnReasonId : null,
      apiSource: 'v2.0',
    });
  }

  private transformV2PurchaseCreditMemoLine(data: any, purchaseCreditMemoId: string): PurchaseCreditMemoLine {
    return this.purchaseCreditMemoLineRepository.create({
      id: data.id,
      purchaseCreditMemoId: purchaseCreditMemoId,
      sequence: data.sequence,
      itemId: data.itemId !== '00000000-0000-0000-0000-000000000000' ? data.itemId : null,
      accountId: data.accountId !== '00000000-0000-0000-0000-000000000000' ? data.accountId : null,
      lineType: data.lineType,
      lineObjectNumber: data.lineObjectNumber || null,
      description: data.description || null,
      unitOfMeasureId: data.unitOfMeasureId !== '00000000-0000-0000-0000-000000000000' ? data.unitOfMeasureId : null,
      unitOfMeasureCode: data.unitOfMeasureCode || null,
      unitCost: data.unitCost,
      quantity: data.quantity,
      discountAmount: data.discountAmount,
      discountPercent: data.discountPercent,
      discountAppliedBeforeTax: data.discountAppliedBeforeTax,
      amountExcludingTax: data.amountExcludingTax,
      taxCode: data.taxCode || null,
      taxPercent: data.taxPercent,
      totalTaxAmount: data.totalTaxAmount,
      amountIncludingTax: data.amountIncludingTax,
      invoiceDiscountAllocation: data.invoiceDiscountAllocation,
      netAmount: data.netAmount,
      netTaxAmount: data.netTaxAmount,
      netAmountIncludingTax: data.netAmountIncludingTax,
      itemVariantId: data.itemVariantId !== '00000000-0000-0000-0000-000000000000' ? data.itemVariantId : null,
      locationId: data.locationId !== '00000000-0000-0000-0000-000000000000' ? data.locationId : null,
      apiSource: 'v2.0',
    });
  }

  // ----------------------------------
  // Additional Synchronization Methods
  // ----------------------------------
  // Implement synchronization methods for other entities like accounts, general ledger entries, dimensions, etc., following the same pattern.

  // ----------------------------------
  // Helper Methods
  // ----------------------------------
  // Include any additional helper methods required for data transformation or processing.
}
