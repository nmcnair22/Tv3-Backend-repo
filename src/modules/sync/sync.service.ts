// src/modules/sync/sync.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// Entity imports
import { Account } from './entities/account.entity';
import { BankAccount } from './entities/bank-account.entity';
import { BillingScheduleLine } from './entities/billing-schedule-line.entity';
import { CustomerLedgerEntry } from './entities/customer-ledger-entry.entity';
import { Customer } from './entities/customer.entity';
import { GeneralLedgerEntry } from './entities/general-ledger-entry.entity';
import { Item } from './entities/item.entity';
import { Job } from './entities/job.entity';
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
import { ShipToAddress } from './entities/ship-to-address.entity';
import { SyncStatus } from './entities/sync-status.entity';
import { Vendor } from './entities/vendor.entity';

// API Service imports
import { TmcApiService } from './tmc-api/tmc-api.service';
import { V2ApiService } from './v2-api/v2-api.service';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    // API Services
    private readonly v2ApiService: V2ApiService,
    private readonly tmcApiService: TmcApiService,

    // Repositories
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

    @InjectRepository(GeneralLedgerEntry)
    private readonly generalLedgerEntryRepository: Repository<GeneralLedgerEntry>,

    @InjectRepository(CustomerLedgerEntry)
    private readonly customerLedgerEntryRepository: Repository<CustomerLedgerEntry>,

    @InjectRepository(SyncStatus)
    private readonly syncStatusRepository: Repository<SyncStatus>,

    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,

    @InjectRepository(BankAccount)
    private readonly bankAccountRepository: Repository<BankAccount>,

    @InjectRepository(ShipToAddress)
    private readonly shipToAddressRepository: Repository<ShipToAddress>,

    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,

    @InjectRepository(BillingScheduleLine)
    private readonly billingScheduleLineRepository: Repository<BillingScheduleLine>,
  ) {}

  /**
   * Scheduled Cron Job to Synchronize Data
   * Runs every hour at minute 0
   */
  @Cron('0 * * * *')
  async handleCron() {
    this.logger.debug('Starting scheduled synchronization...');
    await this.syncAll();
  }

  /**
   * Scheduled Cron Job for Full Synchronization
   * Runs at 3 AM every Sunday
   */
  @Cron('0 3 * * 0')
  async handleWeeklyFullSync() {
    this.logger.debug('Starting scheduled full synchronization...');
    await this.syncAll(true);
  }

/**
 * Synchronize All Data
 */
async syncAll(fullSync: boolean = false) {
  try {
    // Synchronize customers first
    await this.syncCustomers(fullSync);
    // Synchronize other entities
    await this.syncVendors(fullSync);
    await this.syncAccounts(fullSync);
    await this.syncItems(fullSync); 
    await this.syncPurchaseInvoices(fullSync);
    await this.syncPurchaseOrders(fullSync);
    await this.syncPurchaseCreditMemos(fullSync);
    await this.syncSalesInvoices(fullSync);
    await this.syncSalesCreditMemos(fullSync);
    await this.syncGeneralLedgerEntries(fullSync);
    await this.syncCustomerLedgerEntries(fullSync);
    await this.syncBankAccounts(fullSync);
    await this.syncShipToAddresses(fullSync);
    await this.syncJobs(fullSync);
    await this.syncBillingScheduleLines(); // Always performs a full sync

    this.logger.debug('Synchronization completed successfully.');
  } catch (error) {
    this.logger.error('Synchronization failed', error.stack);
    throw new Error('Synchronization failed.');
  }
}

// ----------------------------------
// Customer Synchronization
// ----------------------------------
async syncCustomers(fullSync: boolean = false) {
  this.logger.debug(`Synchronizing customers (fullSync=${fullSync})...`);
  const entityName = 'customers';
  try {
    const lastSync = fullSync ? null : await this.getLastSyncTimestamp(entityName);

    // Sync customers from V2 API
    const v2Customers = await this.v2ApiService.getCustomers(lastSync);
    this.logger.debug(`Fetched ${v2Customers.length} customers from V2 API`);

    const dynamicsIds = new Set<string>();

    for (const v2Customer of v2Customers) {
      const customerEntity = this.transformV2Customer(v2Customer);
      await this.customerRepository.save(customerEntity);
      dynamicsIds.add(customerEntity.id);
      this.logger.debug(`Saved customer ${customerEntity.customerNumber} to database`);
    }

    // Optional: Handle deletions during full sync (if required)
    /*
    if (fullSync) {
      const localCustomers = await this.customerRepository.find({ select: ['id'] });
      const localIds = localCustomers.map(c => c.id);

      const idsToDelete = localIds.filter(id => !dynamicsIds.has(id));

      if (idsToDelete.length > 0) {
        await this.customerRepository.delete(idsToDelete);
        this.logger.debug(`Deleted ${idsToDelete.length} customers not present in Dynamics`);
      }
    }
    */

    await this.updateLastSyncTimestamp(entityName);
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
    type: data.type || null,
    addressLine1: data.addressLine1 || null,
    addressLine2: data.addressLine2 || null,
    city: data.city || null,
    state: data.state || null,
    postalCode: data.postalCode || null,
    country: data.country || null,
    phoneNumber: data.phoneNumber || null,
    email: data.email || null,
    website: data.website || null,
    salespersonCode: data.salespersonCode || null,
    balanceDue: data.balanceDue || null,
    creditLimit: data.creditLimit || null,
    taxLiable: data.taxLiable ?? null, // Using nullish coalescing operator to handle false values
    taxAreaId: data.taxAreaId || null,
    taxAreaDisplayName: data.taxAreaDisplayName || null,
    taxRegistrationNumber: data.taxRegistrationNumber || null,
    currencyId: data.currencyId || null,
    currencyCode: data.currencyCode || null,
    paymentTermsId: data.paymentTermsId || null,
    shipmentMethodId: data.shipmentMethodId || null,
    paymentMethodId: data.paymentMethodId || null,
    blocked: data.blocked || null,
    lastModifiedDateTime: data.lastModifiedDateTime ? new Date(data.lastModifiedDateTime) : null,
    apiSource: 'v2.0',
  });
}

async syncVendors(fullSync: boolean = false) {
  this.logger.debug(`Synchronizing vendors (fullSync=${fullSync})...`);
  const entityName = 'vendor';
  try {
    // Removed clearing of the vendor table to maintain referential integrity

    const lastSync = fullSync ? null : await this.getLastSyncTimestamp(entityName);

    const v2Vendors = await this.v2ApiService.getVendors(lastSync);
    this.logger.debug(`Fetched ${v2Vendors.length} vendors from V2 API`);

    for (const v2Vendor of v2Vendors) {
      const vendorEntity = this.transformV2Vendor(v2Vendor);
      await this.vendorRepository.save(vendorEntity);
      this.logger.debug(`Saved vendor ${vendorEntity.number} to database`);
    }

    await this.updateLastSyncTimestamp(entityName);
  } catch (error) {
    this.logger.error('Error during vendor synchronization', error.stack);
    throw error;
  }
}

private transformV2Vendor(data: any): Vendor {
  return this.vendorRepository.create({
    id: data.id,
    number: data.number,
    displayName: data.displayName || null,
    addressLine1: data.addressLine1 || null,
    addressLine2: data.addressLine2 || null,
    city: data.city || null,
    state: data.state || null,
    country: data.country || null,
    postalCode: data.postalCode || null,
    phoneNumber: data.phoneNumber || null,
    email: data.email || null,
    website: data.website || null,
    taxRegistrationNumber: data.taxRegistrationNumber || null,
    currencyCode: data.currencyCode || null,
    irs1099Code: data.irs1099Code || null,
    paymentTermsCode: data.paymentTermsCode || null,
    paymentMethodCode: data.paymentMethodCode || null,
    taxLiable: data.taxLiable || null,
    blocked: data.blocked || null,
    balance: data.balance || 0,
    lastModifiedDateTime: data.lastModifiedDateTime
      ? new Date(data.lastModifiedDateTime)
      : null,
    apiSource: 'v2.0',
  });
}

// ----------------------------------
  // Item Synchronization
  // ----------------------------------
  async syncItems(fullSync: boolean = false) {
    this.logger.debug(`Synchronizing items (fullSync=${fullSync})...`);
    const entityName = 'item'; // Use singular to match your entity names
    try {
      const lastSync = fullSync ? null : await this.getLastSyncTimestamp(entityName);
  
      const v2Items = await this.v2ApiService.getItems(lastSync);
      this.logger.debug(`Fetched ${v2Items.length} items from V2 API`);
  
      for (const v2Item of v2Items) {
        const itemEntity = this.transformV2Item(v2Item);
        await this.itemRepository.save(itemEntity);
        this.logger.debug(`Saved item ${itemEntity.number} to database`);
      }
  
      // Optional: Handle deletions during full sync (if required)
  
      // Update sync status
      await this.updateLastSyncTimestamp(entityName);
    } catch (error) {
      this.logger.error('Error during item synchronization', error.stack);
      throw error;
    }
  }

private transformV2Item(data: any): Item {
  return this.itemRepository.create({
    id: data.id,
    number: data.number,
    displayName: data.displayName,
    displayName2: data.displayName2 || null,
    type: data.type,
    itemCategoryId:
      data.itemCategoryId !== '00000000-0000-0000-0000-000000000000'
        ? data.itemCategoryId
        : null,
    itemCategoryCode: data.itemCategoryCode || null,
    blocked: data.blocked,
    gtin: data.gtin || null,
    inventory: data.inventory,
    unitPrice: data.unitPrice,
    priceIncludesTax: data.priceIncludesTax,
    unitCost: data.unitCost,
    taxGroupId:
      data.taxGroupId !== '00000000-0000-0000-0000-000000000000'
        ? data.taxGroupId
        : null,
    taxGroupCode: data.taxGroupCode || null,
    baseUnitOfMeasureId:
      data.baseUnitOfMeasureId !== '00000000-0000-0000-0000-000000000000'
        ? data.baseUnitOfMeasureId
        : null,
    baseUnitOfMeasureCode: data.baseUnitOfMeasureCode || null,
    generalProductPostingGroupId:
      data.generalProductPostingGroupId !== '00000000-0000-0000-0000-000000000000'
        ? data.generalProductPostingGroupId
        : null,
    generalProductPostingGroupCode: data.generalProductPostingGroupCode || null,
    inventoryPostingGroupId:
      data.inventoryPostingGroupId !== '00000000-0000-0000-0000-000000000000'
        ? data.inventoryPostingGroupId
        : null,
    inventoryPostingGroupCode: data.inventoryPostingGroupCode || null,
    lastModifiedDateTime: data.lastModifiedDateTime
      ? new Date(data.lastModifiedDateTime)
      : null,
    apiSource: 'v2.0',
  });
}

// ----------------------------------
// Sales Invoice Synchronization
// ----------------------------------

async syncSalesInvoices(fullSync: boolean = false) {
  this.logger.debug(`Synchronizing sales invoices (fullSync=${fullSync})...`);
  const entityName = 'sales_invoice';
  try {
    const lastSync = fullSync ? null : await this.getLastSyncTimestamp(entityName);

    const v2SalesInvoices = await this.v2ApiService.getSalesInvoices(lastSync);
    this.logger.debug(`Fetched ${v2SalesInvoices.length} sales invoices from V2 API`);

    for (const v2Invoice of v2SalesInvoices) {
      const customerId = v2Invoice.customerId;

      // Check if customerId is valid
      if (!customerId || customerId === '00000000-0000-0000-0000-000000000000') {
        this.logger.warn(
          `Invalid or missing customerId for invoice ${v2Invoice.number}. Skipping invoice.`,
        );
        continue; // Skip this invoice
      }

      // Ensure customer exists in local database
      await this.ensureCustomerExists(customerId);

      // Continue with saving the invoice
      const invoiceEntity = this.transformV2SalesInvoice(v2Invoice);
      await this.salesInvoiceRepository.save(invoiceEntity);
      this.logger.debug(`Saved sales invoice ${invoiceEntity.number} to database`);

      // Fetch and sync sales invoice lines
      await this.syncSalesInvoiceLines(v2Invoice.id, invoiceEntity.id);
    }

    // Update the last sync timestamp
    await this.updateLastSyncTimestamp(entityName);
  } catch (error) {
    this.logger.error('Error during sales invoice synchronization', error.stack);
    throw error;
  }
}

private async syncSalesInvoiceLines(invoiceId: string, documentId: string): Promise<void> {
  const v2InvoiceLines = await this.v2ApiService.getSalesInvoiceLines(invoiceId);
  this.logger.debug(
    `Fetched ${v2InvoiceLines.length} sales invoice lines for invoice ${invoiceId} from V2 API`,
  );

  for (const v2Line of v2InvoiceLines) {
    const lineEntity = this.transformV2SalesInvoiceLine(v2Line, documentId);
    await this.salesInvoiceLineRepository.save(lineEntity);
    this.logger.debug(`Saved sales invoice line ${lineEntity.id} to database`);
  }
}

private transformV2SalesInvoice(data: any): SalesInvoice {
  return this.salesInvoiceRepository.create({
    id: data.id,
    number: data.number,
    externalDocumentNumber: data.externalDocumentNumber || null,
    invoiceDate: data.invoiceDate
      ? this.parseDateString(data.invoiceDate)
      : null,
    postingDate: data.postingDate
      ? this.parseDateString(data.postingDate)
      : null,
    dueDate: data.dueDate
      ? this.parseDateString(data.dueDate)
      : null,
    promisedPayDate:
      data.promisedPayDate && data.promisedPayDate !== '0001-01-01'
        ? this.parseDateString(data.promisedPayDate)
        : null,
    customerPurchaseOrderReference: data.customerPurchaseOrderReference || null,
    customerId:
      data.customerId && data.customerId !== '00000000-0000-0000-0000-000000000000'
        ? data.customerId
        : null,
    customerNumber: data.customerNumber,
    customerName: data.customerName || null,
    billToName: data.billToName || null,
    billToCustomerId:
      data.billToCustomerId && data.billToCustomerId !== '00000000-0000-0000-0000-000000000000'
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
    currencyId:
      data.currencyId && data.currencyId !== '00000000-0000-0000-0000-000000000000'
        ? data.currencyId
        : null,
    shortcutDimension1Code: data.shortcutDimension1Code || null,
    shortcutDimension2Code: data.shortcutDimension2Code || null,
    currencyCode: data.currencyCode || null,
    orderId:
      data.orderId && data.orderId !== '00000000-0000-0000-0000-000000000000'
        ? data.orderId
        : null,
    orderNumber: data.orderNumber || null,
    paymentTermsId:
      data.paymentTermsId && data.paymentTermsId !== '00000000-0000-0000-0000-000000000000'
        ? data.paymentTermsId
        : null,
    shipmentMethodId:
      data.shipmentMethodId && data.shipmentMethodId !== '00000000-0000-0000-0000-000000000000'
        ? data.shipmentMethodId
        : null,
    salesperson: data.salesperson || null,
    disputeStatusId:
      data.disputeStatusId && data.disputeStatusId !== '00000000-0000-0000-0000-000000000000'
        ? data.disputeStatusId
        : null,
    disputeStatus: data.disputeStatus || null,
    pricesIncludeTax: data.pricesIncludeTax,
    remainingAmount: data.remainingAmount,
    discountAmount: data.discountAmount,
    discountAppliedBeforeTax: data.discountAppliedBeforeTax,
    totalAmountExcludingTax: data.totalAmountExcludingTax,
    totalTaxAmount: data.totalTaxAmount,
    totalAmountIncludingTax: data.totalAmountIncludingTax,
    status: data.status || null,
    lastModifiedDateTime: data.lastModifiedDateTime ? new Date(data.lastModifiedDateTime) : null,
    phoneNumber: data.phoneNumber || null,
    email: data.email || null,
    apiSource: 'v2.0',
  });
}

private transformV2SalesInvoiceLine(data: any, documentId: string): SalesInvoiceLine {
  // Handle and validate the discountPercent value
  let discountPercent = data.discountPercent;

  // Ensure discountPercent is a number
  if (typeof discountPercent !== 'number' || isNaN(discountPercent)) {
    this.logger.warn(
      `Invalid discount percent value for line ${data.id}. Setting discountPercent to 0.`,
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
      `Discount percent ${discountPercent}% exceeds 100% for line ${data.id}. Capping at 100%.`,
    );
    discountPercent = 100;
  } else if (discountPercent < 0) {
    this.logger.warn(
      `Negative discount percent ${discountPercent}% for line ${data.id}. Setting to 0%.`,
    );
    discountPercent = 0;
  }

  return this.salesInvoiceLineRepository.create({
    id: data.id,
    documentId: documentId,
    sequence: data.sequence,
    itemId:
      data.itemId && data.itemId !== '00000000-0000-0000-0000-000000000000'
        ? data.itemId
        : null,
    accountId:
      data.accountId && data.accountId !== '00000000-0000-0000-0000-000000000000'
        ? data.accountId
        : null,
    lineType: data.lineType || null,
    lineObjectNumber: data.lineObjectNumber || null,
    description: data.description || null,
    description2: data.description2 || null,
    unitOfMeasureId:
      data.unitOfMeasureId && data.unitOfMeasureId !== '00000000-0000-0000-0000-000000000000'
        ? data.unitOfMeasureId
        : null,
    unitOfMeasureCode: data.unitOfMeasureCode || null,
    quantity: data.quantity,
    unitPrice: data.unitPrice,
    discountAmount: data.discountAmount,
    discountPercent: discountPercent,
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
      data.itemVariantId && data.itemVariantId !== '00000000-0000-0000-0000-000000000000'
        ? data.itemVariantId
        : null,
    locationId:
      data.locationId && data.locationId !== '00000000-0000-0000-0000-000000000000'
        ? data.locationId
        : null,
    apiSource: 'v2.0',
  });
}

// ----------------------------------
// Sales Credit Memo Synchronization
// ----------------------------------
async syncSalesCreditMemos(fullSync: boolean = false) {
  this.logger.debug(`Synchronizing sales credit memos (fullSync=${fullSync})...`);
  const entityName = 'sales_credit_memo';
  try {
    const lastSync = fullSync ? null : await this.getLastSyncTimestamp(entityName);

    const v2CreditMemos = await this.v2ApiService.getSalesCreditMemos(lastSync);
    this.logger.debug(`Fetched ${v2CreditMemos.length} sales credit memos from V2 API`);

    for (const v2Memo of v2CreditMemos) {
      const customerId = v2Memo.customerId;

      // Ensure customer exists if customerId is not null or empty GUID
      if (customerId && customerId !== '00000000-0000-0000-0000-000000000000') {
        await this.ensureCustomerExists(customerId);
      }

      const memoEntity = this.transformV2SalesCreditMemo(v2Memo);
      await this.salesCreditMemoRepository.save(memoEntity);
      this.logger.debug(`Saved sales credit memo ${memoEntity.number} to database`);

      // Fetch and sync sales credit memo lines
      await this.syncSalesCreditMemoLines(v2Memo.id, memoEntity.id);
    }

    // Remove deletion logic since credit memos are not deleted in Dynamics

    await this.updateLastSyncTimestamp(entityName);
  } catch (error) {
    this.logger.error('Error during sales credit memo synchronization', error.stack);
    throw error;
  }
}

private async syncSalesCreditMemoLines(creditMemoId: string, salesCreditMemoId: string): Promise<void> {
  const v2MemoLines = await this.v2ApiService.getSalesCreditMemoLines(creditMemoId);
  this.logger.debug(
    `Fetched ${v2MemoLines.length} sales credit memo lines for memo ${creditMemoId} from V2 API`,
  );

  for (const v2Line of v2MemoLines) {
    const lineEntity = this.transformV2SalesCreditMemoLine(v2Line, salesCreditMemoId);
    await this.salesCreditMemoLineRepository.save(lineEntity);
    this.logger.debug(`Saved sales credit memo line ${lineEntity.id} to database`);
  }
}

private transformV2SalesCreditMemo(data: any): SalesCreditMemo {
  return this.salesCreditMemoRepository.create({
    id: data.id,
    number: data.number,
    externalDocumentNumber: data.externalDocumentNumber || null,
    creditMemoDate: this.parseDateString(data.creditMemoDate),
    postingDate: this.parseDateString(data.postingDate),
    dueDate: this.parseDateString(data.dueDate),
    customerId: this.transformNullableGuid(data.customerId),
    customerNumber: data.customerNumber,
    customerName: data.customerName || null,
    billToName: data.billToName || null,
    billToCustomerId: this.transformNullableGuid(data.billToCustomerId),
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
    shortcutDimension1Code: data.shortcutDimension1Code || null,
    shortcutDimension2Code: data.shortcutDimension2Code || null,
    currencyId: this.transformNullableGuid(data.currencyId),
    currencyCode: data.currencyCode || null,
    paymentTermsId: this.transformNullableGuid(data.paymentTermsId),
    shipmentMethodId: this.transformNullableGuid(data.shipmentMethodId),
    salesperson: data.salesperson || null,
    pricesIncludeTax: data.pricesIncludeTax,
    discountAmount: data.discountAmount,
    discountAppliedBeforeTax: data.discountAppliedBeforeTax,
    totalAmountExcludingTax: data.totalAmountExcludingTax,
    totalTaxAmount: data.totalTaxAmount,
    totalAmountIncludingTax: data.totalAmountIncludingTax,
    status: data.status || null,
    lastModifiedDateTime: this.parseDateString(data.lastModifiedDateTime),
    invoiceId: this.transformNullableGuid(data.invoiceId),
    invoiceNumber: data.invoiceNumber || null,
    phoneNumber: data.phoneNumber || null,
    email: data.email || null,
    customerReturnReasonId: this.transformNullableGuid(data.customerReturnReasonId),
    apiSource: 'v2.0',
  });
}

private transformV2SalesCreditMemoLine(
  data: any,
  salesCreditMemoId: string,
): SalesCreditMemoLine {
  // Handle and validate the discountPercent value
  let discountPercent = data.discountPercent;

  // Ensure discountPercent is a number
  if (typeof discountPercent !== 'number' || isNaN(discountPercent)) {
    this.logger.warn(
      `Invalid discount percent value for line ${data.id}. Setting discountPercent to 0.`,
    );
    discountPercent = 0;
  }

  // If discountPercent is a decimal fraction between 0 and 1, convert it to percentage
  if (discountPercent > 0 && discountPercent < 1) {
    discountPercent = discountPercent * 100;
  }

  // Round discountPercent to appropriate precision
  discountPercent = parseFloat(discountPercent.toFixed(10));

  // Ensure discountPercent is within a valid range (0% to 100%)
  if (discountPercent > 100) {
    this.logger.warn(
      `Discount percent ${discountPercent}% exceeds 100% for line ${data.id}. Capping at 100%.`,
    );
    discountPercent = 100;
  } else if (discountPercent < 0) {
    this.logger.warn(
      `Negative discount percent ${discountPercent}% for line ${data.id}. Setting to 0%.`,
    );
    discountPercent = 0;
  }

  return this.salesCreditMemoLineRepository.create({
    id: data.id,
    documentId: salesCreditMemoId,
    sequence: data.sequence,
    itemId: this.transformNullableGuid(data.itemId),
    accountId: this.transformNullableGuid(data.accountId),
    lineType: data.lineType || null,
    lineObjectNumber: data.lineObjectNumber || null,
    description: data.description || null,
    description2: data.description2 || null,
    unitOfMeasureId: this.transformNullableGuid(data.unitOfMeasureId),
    unitOfMeasureCode: data.unitOfMeasureCode || null,
    unitPrice: data.unitPrice,
    quantity: data.quantity,
    discountAmount: data.discountAmount,
    discountPercent: discountPercent,
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
    shipmentDate: this.parseDateString(data.shipmentDate),
    itemVariantId: this.transformNullableGuid(data.itemVariantId),
    locationId: this.transformNullableGuid(data.locationId),
    apiSource: 'v2.0',
  });
}

// ----------------------------------
// Purchase Invoice Synchronization
// ----------------------------------
async syncPurchaseInvoices(fullSync: boolean = false) {
  this.logger.debug(`Synchronizing purchase invoices (fullSync=${fullSync})...`);
  const entityName = 'purchase_invoices';
  try {
    const lastSync = fullSync ? null : await this.getLastSyncTimestamp(entityName);

    const v2PurchaseInvoices = await this.v2ApiService.getPurchaseInvoices(lastSync);
    this.logger.debug(`Fetched ${v2PurchaseInvoices.length} purchase invoices from V2 API`);

    for (const v2Invoice of v2PurchaseInvoices) {
      // Ensure required fields are present
      if (!v2Invoice.vendorNumber) {
        this.logger.warn(`Skipping purchase invoice ${v2Invoice.id} due to missing vendorNumber`);
        continue;
      }
      if (!v2Invoice.payToVendorNumber) {
        this.logger.warn(`Skipping purchase invoice ${v2Invoice.id} due to missing payToVendorNumber`);
        continue;
      }

      const vendorId = v2Invoice.vendorId !== '00000000-0000-0000-0000-000000000000' ? v2Invoice.vendorId : null;

      // Ensure vendor exists
      if (vendorId) {
        await this.ensureVendorExists(vendorId);
      } else {
        this.logger.warn(`Vendor ID is missing or invalid for purchase invoice ${v2Invoice.id}`);
      }

      const invoiceEntity = this.transformV2PurchaseInvoice(v2Invoice);
      await this.purchaseInvoiceRepository.save(invoiceEntity);
      this.logger.debug(`Saved purchase invoice ${invoiceEntity.number} to database`);

      // Fetch and sync purchase invoice lines
      await this.syncPurchaseInvoiceLines(v2Invoice.id, v2Invoice.id);
    }

    // Since purchase invoices are not deleted in Dynamics, we don't need deletion logic

    await this.updateLastSyncTimestamp(entityName);
  } catch (error) {
    this.logger.error('Error during purchase invoice synchronization', error.stack);
    throw error;
  }
}

private async syncPurchaseInvoiceLines(purchaseInvoiceId: string, purchaseInvoiceDbId: string): Promise<void> {
  const v2InvoiceLines = await this.v2ApiService.getPurchaseInvoiceLines(purchaseInvoiceId);
  this.logger.debug(
    `Fetched ${v2InvoiceLines.length} purchase invoice lines for invoice ${purchaseInvoiceId} from V2 API`,
  );

  for (const v2Line of v2InvoiceLines) {
    const lineEntity = this.transformV2PurchaseInvoiceLine(v2Line, purchaseInvoiceDbId);

    // Since items are synchronized beforehand, we don't need to ensure their existence here.

    await this.purchaseInvoiceLineRepository.save(lineEntity);
    this.logger.debug(`Saved purchase invoice line ${lineEntity.id} to database`);
  }
}

private transformV2PurchaseInvoice(data: any): PurchaseInvoice {
  if (!data.vendorNumber) {
    throw new Error(`Vendor number is missing for purchase invoice ${data.id}`);
  }
  if (!data.payToVendorNumber) {
    throw new Error(`Pay-to vendor number is missing for purchase invoice ${data.id}`);
  }

  return this.purchaseInvoiceRepository.create({
    id: data.id,
    number: data.number,
    postingDate: this.parseDate(data.postingDate),
    invoiceDate: this.parseDate(data.invoiceDate),
    dueDate: this.parseDate(data.dueDate),
    vendorInvoiceNumber: data.vendorInvoiceNumber || null,
    vendorId: data.vendorId !== '00000000-0000-0000-0000-000000000000' ? data.vendorId : null,
    vendorNumber: data.vendorNumber,
    vendorName: data.vendorName || null,
    payToName: data.payToName || null,
    payToContact: data.payToContact || null,
    payToVendorId:
      data.payToVendorId !== '00000000-0000-0000-0000-000000000000' ? data.payToVendorId : null,
    payToVendorNumber: data.payToVendorNumber,
    shipToName: data.shipToName || null,
    shipToContact: data.shipToContact || null,
    buyFromAddressLine1: data.buyFromAddressLine1 || null,
    buyFromAddressLine2: data.buyFromAddressLine2 || null,
    buyFromCity: data.buyFromCity || null,
    buyFromCountry: data.buyFromCountry || null,
    buyFromState: data.buyFromState || null,
    buyFromPostCode: data.buyFromPostCode || null,
    shipToAddressLine1: data.shipToAddressLine1 || null,
    shipToAddressLine2: data.shipToAddressLine2 || null,
    shipToCity: data.shipToCity || null,
    shipToCountry: data.shipToCountry || null,
    shipToState: data.shipToState || null,
    shipToPostCode: data.shipToPostCode || null,
    payToAddressLine1: data.payToAddressLine1 || null,
    payToAddressLine2: data.payToAddressLine2 || null,
    payToCity: data.payToCity || null,
    payToCountry: data.payToCountry || null,
    payToState: data.payToState || null,
    payToPostCode: data.payToPostCode || null,
    shortcutDimension1Code: data.shortcutDimension1Code || null,
    shortcutDimension2Code: data.shortcutDimension2Code || null,
    currencyId: data.currencyId !== '00000000-0000-0000-0000-000000000000' ? data.currencyId : null,
    currencyCode: data.currencyCode || null,
    orderId:
      data.orderId !== '00000000-0000-0000-0000-000000000000' ? data.orderId : null,
    orderNumber: data.orderNumber || null,
    purchaser: data.purchaser || null,
    pricesIncludeTax: data.pricesIncludeTax ?? null,
    discountAmount: data.discountAmount ?? null,
    discountAppliedBeforeTax: data.discountAppliedBeforeTax ?? null,
    totalAmountExcludingTax: data.totalAmountExcludingTax ?? null,
    totalTaxAmount: data.totalTaxAmount ?? null,
    totalAmountIncludingTax: data.totalAmountIncludingTax ?? null,
    status: data.status || null,
    lastModifiedDateTime: data.lastModifiedDateTime ? new Date(data.lastModifiedDateTime) : null,
    apiSource: 'v2.0',
  });
}

private transformV2PurchaseInvoiceLine(data: any, purchaseInvoiceDbId: string): PurchaseInvoiceLine {
  return this.purchaseInvoiceLineRepository.create({
    id: data.id,
    documentId: purchaseInvoiceDbId,
    sequence: data.sequence || null,
    itemId:
      data.itemId && data.itemId !== '00000000-0000-0000-0000-000000000000'
        ? data.itemId
        : null,
    accountId:
      data.accountId && data.accountId !== '00000000-0000-0000-0000-000000000000'
        ? data.accountId
        : null,
    lineType: data.lineType || null,
    lineObjectNumber: data.lineObjectNumber || null,
    description: data.description || null,
    description2: data.description2 || null,
    unitOfMeasureId:
      data.unitOfMeasureId && data.unitOfMeasureId !== '00000000-0000-0000-0000-000000000000'
        ? data.unitOfMeasureId
        : null,
    unitOfMeasureCode: data.unitOfMeasureCode || null,
    unitCost: data.unitCost ?? null,
    quantity: data.quantity ?? null,
    discountAmount: data.discountAmount ?? null,
    discountPercent: data.discountPercent ?? null,
    discountAppliedBeforeTax: data.discountAppliedBeforeTax ?? null,
    amountExcludingTax: data.amountExcludingTax ?? null,
    taxCode: data.taxCode || null,
    taxPercent: data.taxPercent ?? null,
    totalTaxAmount: data.totalTaxAmount ?? null,
    amountIncludingTax: data.amountIncludingTax ?? null,
    invoiceDiscountAllocation: data.invoiceDiscountAllocation ?? null,
    netAmount: data.netAmount ?? null,
    netTaxAmount: data.netTaxAmount ?? null,
    netAmountIncludingTax: data.netAmountIncludingTax ?? null,
    expectedReceiptDate: data.expectedReceiptDate
      ? new Date(data.expectedReceiptDate)
      : null,
    itemVariantId:
      data.itemVariantId !== '00000000-0000-0000-0000-000000000000'
        ? data.itemVariantId
        : null,
    locationId:
      data.locationId !== '00000000-0000-0000-0000-000000000000' ? data.locationId : null,
    apiSource: 'v2.0',
  });
}

private parseDate(dateString: string | null): Date | null {
  return dateString ? new Date(dateString) : null;
}


// ----------------------------------
// Purchase Order Synchronization
// ----------------------------------
async syncPurchaseOrders(fullSync: boolean = false) {
  this.logger.debug(`Synchronizing purchase orders (fullSync=${fullSync})...`);
  const entityName = 'purchase_orders';
  try {
    const lastSync = fullSync ? null : await this.getLastSyncTimestamp(entityName);

    const v2PurchaseOrders = await this.v2ApiService.getPurchaseOrders(lastSync);
    this.logger.debug(`Fetched ${v2PurchaseOrders.length} purchase orders from V2 API`);

    for (const v2Order of v2PurchaseOrders) {
      const vendorId = v2Order.vendorId;

      // Ensure vendor exists
      if (vendorId && vendorId !== '00000000-0000-0000-0000-000000000000') {
        await this.ensureVendorExists(vendorId);
      }

      const orderEntity = await this.transformV2PurchaseOrder(v2Order);
      await this.purchaseOrderRepository.save(orderEntity);
      this.logger.debug(`Saved purchase order ${orderEntity.number} to database`);

      // Fetch and sync purchase order lines
      await this.syncPurchaseOrderLines(v2Order.id, orderEntity.id);
    }

    // Remove deletion logic since purchase orders are not deleted in Dynamics

    await this.updateLastSyncTimestamp(entityName);
  } catch (error) {
    this.logger.error('Error during purchase order synchronization', error.stack);
    throw error;
  }
}

private async syncPurchaseOrderLines(purchaseOrderId: string, purchaseOrderDbId: string): Promise<void> {
  const v2OrderLines = await this.v2ApiService.getPurchaseOrderLines(purchaseOrderId);
  this.logger.debug(
    `Fetched ${v2OrderLines.length} purchase order lines for order ${purchaseOrderId} from V2 API`,
  );

  for (const v2Line of v2OrderLines) {
    const lineEntity = this.transformV2PurchaseOrderLine(v2Line, purchaseOrderDbId);
    await this.purchaseOrderLineRepository.save(lineEntity);
    this.logger.debug(`Saved purchase order line ${lineEntity.id} to database`);
  }
}

private transformV2PurchaseOrder(data: any): PurchaseOrder {
  return this.purchaseOrderRepository.create({
    id: data.id,
    number: data.number,
    orderDate: this.parseDateString(data.orderDate),
    postingDate: this.parseDateString(data.postingDate),
    vendorId: data.vendorId && data.vendorId !== '00000000-0000-0000-0000-000000000000'
      ? data.vendorId
      : null,
    vendorNumber: data.vendorNumber,
    vendorName: data.vendorName || null,
    payToName: data.payToName || null,
    payToVendorId: data.payToVendorId && data.payToVendorId !== '00000000-0000-0000-0000-000000000000'
      ? data.payToVendorId
      : null,
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
    currencyId: data.currencyId && data.currencyId !== '00000000-0000-0000-0000-000000000000'
      ? data.currencyId
      : null,
    currencyCode: data.currencyCode || null,
    pricesIncludeTax: data.pricesIncludeTax || null,
    paymentTermsId: data.paymentTermsId && data.paymentTermsId !== '00000000-0000-0000-0000-000000000000'
      ? data.paymentTermsId
      : null,
    shipmentMethodId: data.shipmentMethodId && data.shipmentMethodId !== '00000000-0000-0000-0000-000000000000'
      ? data.shipmentMethodId
      : null,
    purchaser: data.purchaser || null,
    requestedReceiptDate: this.parseDateString(data.requestedReceiptDate),
    discountAmount: data.discountAmount || null,
    discountAppliedBeforeTax: data.discountAppliedBeforeTax || null,
    totalAmountExcludingTax: data.totalAmountExcludingTax || null,
    totalTaxAmount: data.totalTaxAmount || null,
    totalAmountIncludingTax: data.totalAmountIncludingTax || null,
    fullyReceived: data.fullyReceived || null,
    status: data.status || null,
    lastModifiedDateTime: this.parseDateString(data.lastModifiedDateTime),
    apiSource: 'v2.0',
  });
}

private transformV2PurchaseOrderLine(
  data: any,
  purchaseOrderId: string,
): PurchaseOrderLine {
  return this.purchaseOrderLineRepository.create({
    id: data.id,
    documentId: purchaseOrderId,
    sequence: data.sequence || null,
    itemId: data.itemId && data.itemId !== '00000000-0000-0000-0000-000000000000' ? data.itemId : null,
    accountId: data.accountId && data.accountId !== '00000000-0000-0000-0000-000000000000' ? data.accountId : null,
    lineType: data.lineType || null,
    lineObjectNumber: data.lineObjectNumber || null,
    description: data.description || null,
    description2: data.description2 || null,
    unitOfMeasureId: data.unitOfMeasureId && data.unitOfMeasureId !== '00000000-0000-0000-0000-000000000000' ? data.unitOfMeasureId : null,
    unitOfMeasureCode: data.unitOfMeasureCode || null,
    quantity: data.quantity || null,
    directUnitCost: data.directUnitCost || null,
    discountAmount: data.discountAmount || null,
    discountPercent: data.discountPercent || null,
    discountAppliedBeforeTax: data.discountAppliedBeforeTax || null,
    amountExcludingTax: data.amountExcludingTax || null,
    taxCode: data.taxCode || null,
    taxPercent: data.taxPercent || null,
    totalTaxAmount: data.totalTaxAmount || null,
    amountIncludingTax: data.amountIncludingTax || null,
    invoiceDiscountAllocation: data.invoiceDiscountAllocation || null,
    netAmount: data.netAmount || null,
    netTaxAmount: data.netTaxAmount || null,
    netAmountIncludingTax: data.netAmountIncludingTax || null,
    expectedReceiptDate: this.parseDateString(data.expectedReceiptDate),
    receivedQuantity: data.receivedQuantity || null,
    invoicedQuantity: data.invoicedQuantity || null,
    invoiceQuantity: data.invoiceQuantity || null,
    receiveQuantity: data.receiveQuantity || null,
    itemVariantId: data.itemVariantId && data.itemVariantId !== '00000000-0000-0000-0000-000000000000' ? data.itemVariantId : null,
    locationId: data.locationId && data.locationId !== '00000000-0000-0000-0000-000000000000' ? data.locationId : null,
    apiSource: 'v2.0',
  });
}

// ----------------------------------
// Purchase Credit Memo Synchronization
// ----------------------------------
async syncPurchaseCreditMemos(fullSync: boolean = false) {
  this.logger.debug(`Synchronizing purchase credit memos (fullSync=${fullSync})...`);
  const entityName = 'purchase_credit_memos';
  try {
    // Fetch the last sync timestamp unless doing a full sync
    const lastSync = fullSync ? null : await this.getLastSyncTimestamp(entityName);

    // Fetch purchase credit memos from the V2 API
    const v2CreditMemos = await this.v2ApiService.getPurchaseCreditMemos(lastSync);
    this.logger.debug(`Fetched ${v2CreditMemos.length} purchase credit memos from V2 API`);

    for (const v2Memo of v2CreditMemos) {
      const vendorId =
        v2Memo.vendorId && v2Memo.vendorId !== '00000000-0000-0000-0000-000000000000'
          ? v2Memo.vendorId
          : null;

      // Ensure vendor exists if vendorId is present
      if (vendorId) {
        await this.ensureVendorExists(vendorId);
      }

      // Transform and save the purchase credit memo
      const memoEntity = this.transformV2PurchaseCreditMemo(v2Memo);
      await this.purchaseCreditMemoRepository.save(memoEntity);
      this.logger.debug(`Saved purchase credit memo ${memoEntity.number} to database`);

      // Fetch and sync purchase credit memo lines
      await this.syncPurchaseCreditMemoLines(v2Memo.id, memoEntity.id);
    }

    // Update the last sync timestamp
    await this.updateLastSyncTimestamp(entityName);
  } catch (error) {
    this.logger.error('Error during purchase credit memo synchronization', error.stack);
    throw error;
  }
}

private async syncPurchaseCreditMemoLines(creditMemoId: string, purchaseCreditMemoId: string): Promise<void> {
  // Fetch purchase credit memo lines associated with the credit memo
  const v2MemoLines = await this.v2ApiService.getPurchaseCreditMemoLines(creditMemoId);
  this.logger.debug(
    `Fetched ${v2MemoLines.length} purchase credit memo lines for memo ${creditMemoId} from V2 API`,
  );

  for (const v2Line of v2MemoLines) {
    // Transform and save each purchase credit memo line
    const lineEntity = this.transformV2PurchaseCreditMemoLine(v2Line, purchaseCreditMemoId);
    await this.purchaseCreditMemoLineRepository.save(lineEntity);
    this.logger.debug(`Saved purchase credit memo line ${lineEntity.id} to database`);
  }
}

private transformV2PurchaseCreditMemo(data: any): PurchaseCreditMemo {
  return this.purchaseCreditMemoRepository.create({
    id: data.id,
    number: data.number,
    creditMemoDate: data.creditMemoDate ? this.parseDateString(data.creditMemoDate) : null,
    postingDate: data.postingDate ? this.parseDateString(data.postingDate) : null,
    dueDate: data.dueDate ? this.parseDateString(data.dueDate) : null,
    vendorId:
      data.vendorId && data.vendorId !== '00000000-0000-0000-0000-000000000000'
        ? data.vendorId
        : null,
    vendorNumber: data.vendorNumber,
    vendorName: data.vendorName || null,
    payToVendorId:
      data.payToVendorId && data.payToVendorId !== '00000000-0000-0000-0000-000000000000'
        ? data.payToVendorId
        : null,
    payToVendorNumber: data.payToVendorNumber,
    payToName: data.payToName || null,
    buyFromAddressLine1: data.buyFromAddressLine1 || null,
    buyFromAddressLine2: data.buyFromAddressLine2 || null,
    buyFromCity: data.buyFromCity || null,
    buyFromCountry: data.buyFromCountry || null,
    buyFromState: data.buyFromState || null,
    buyFromPostCode: data.buyFromPostCode || null,
    payToAddressLine1: data.payToAddressLine1 || null,
    payToAddressLine2: data.payToAddressLine2 || null,
    payToCity: data.payToCity || null,
    payToCountry: data.payToCountry || null,
    payToState: data.payToState || null,
    payToPostCode: data.payToPostCode || null,
    shortcutDimension1Code: data.shortcutDimension1Code || null,
    shortcutDimension2Code: data.shortcutDimension2Code || null,
    currencyId:
      data.currencyId && data.currencyId !== '00000000-0000-0000-0000-000000000000'
        ? data.currencyId
        : null,
    currencyCode: data.currencyCode || null,
    paymentTermsId:
      data.paymentTermsId && data.paymentTermsId !== '00000000-0000-0000-0000-000000000000'
        ? data.paymentTermsId
        : null,
    shipmentMethodId:
      data.shipmentMethodId && data.shipmentMethodId !== '00000000-0000-0000-0000-000000000000'
        ? data.shipmentMethodId
        : null,
    purchaser: data.purchaser || null,
    pricesIncludeTax:
      data.pricesIncludeTax !== undefined ? data.pricesIncludeTax : null,
    discountAmount:
      data.discountAmount !== undefined ? data.discountAmount : null,
    discountAppliedBeforeTax:
      data.discountAppliedBeforeTax !== undefined ? data.discountAppliedBeforeTax : null,
    totalAmountExcludingTax:
      data.totalAmountExcludingTax !== undefined ? data.totalAmountExcludingTax : null,
    totalTaxAmount:
      data.totalTaxAmount !== undefined ? data.totalTaxAmount : null,
    totalAmountIncludingTax:
      data.totalAmountIncludingTax !== undefined ? data.totalAmountIncludingTax : null,
    status: data.status || null,
    lastModifiedDateTime: data.lastModifiedDateTime
      ? new Date(data.lastModifiedDateTime)
      : null,
    invoiceId:
      data.invoiceId && data.invoiceId !== '00000000-0000-0000-0000-000000000000'
        ? data.invoiceId
        : null,
    invoiceNumber: data.invoiceNumber || null,
    vendorReturnReasonId:
      data.vendorReturnReasonId &&
      data.vendorReturnReasonId !== '00000000-0000-0000-0000-000000000000'
        ? data.vendorReturnReasonId
        : null,
    apiSource: 'v2.0',
  });
}

private transformV2PurchaseCreditMemoLine(
  data: any,
  purchaseCreditMemoId: string,
): PurchaseCreditMemoLine {
  return this.purchaseCreditMemoLineRepository.create({
    id: data.id,
    documentId: purchaseCreditMemoId, // Updated to match entity field name
    sequence: data.sequence !== undefined ? data.sequence : null,
    itemId:
      data.itemId && data.itemId !== '00000000-0000-0000-0000-000000000000'
        ? data.itemId
        : null,
    accountId:
      data.accountId && data.accountId !== '00000000-0000-0000-0000-000000000000'
        ? data.accountId
        : null,
    lineType: data.lineType || null,
    lineObjectNumber: data.lineObjectNumber || null,
    description: data.description || null,
    unitOfMeasureId:
      data.unitOfMeasureId && data.unitOfMeasureId !== '00000000-0000-0000-0000-000000000000'
        ? data.unitOfMeasureId
        : null,
    unitOfMeasureCode: data.unitOfMeasureCode || null,
    unitCost:
      data.unitCost !== undefined ? data.unitCost : null,
    quantity:
      data.quantity !== undefined ? data.quantity : null,
    discountAmount:
      data.discountAmount !== undefined ? data.discountAmount : null,
    discountPercent:
      data.discountPercent !== undefined ? data.discountPercent : null,
    discountAppliedBeforeTax:
      data.discountAppliedBeforeTax !== undefined ? data.discountAppliedBeforeTax : null,
    amountExcludingTax:
      data.amountExcludingTax !== undefined ? data.amountExcludingTax : null,
    taxCode: data.taxCode || null,
    taxPercent:
      data.taxPercent !== undefined ? data.taxPercent : null,
    totalTaxAmount:
      data.totalTaxAmount !== undefined ? data.totalTaxAmount : null,
    amountIncludingTax:
      data.amountIncludingTax !== undefined ? data.amountIncludingTax : null,
    invoiceDiscountAllocation:
      data.invoiceDiscountAllocation !== undefined ? data.invoiceDiscountAllocation : null,
    netAmount:
      data.netAmount !== undefined ? data.netAmount : null,
    netTaxAmount:
      data.netTaxAmount !== undefined ? data.netTaxAmount : null,
    netAmountIncludingTax:
      data.netAmountIncludingTax !== undefined ? data.netAmountIncludingTax : null,
    itemVariantId:
      data.itemVariantId && data.itemVariantId !== '00000000-0000-0000-0000-000000000000'
        ? data.itemVariantId
        : null,
    locationId:
      data.locationId && data.locationId !== '00000000-0000-0000-0000-000000000000'
        ? data.locationId
        : null,
    apiSource: 'v2.0',
  });
}

// ----------------------------------
// G/L Entries Synchronization
// ----------------------------------
async syncGeneralLedgerEntries(fullSync: boolean = false): Promise<void> {
  this.logger.debug(`Synchronizing general ledger entries (fullSync=${fullSync})...`);
  const entityName = 'general_ledger_entries';

  try {
    const lastSync = fullSync ? null : await this.getLastSyncTimestamp(entityName);

    // Ensure accounts are synchronized before G/L entries
    // await this.syncAccounts(fullSync); // Uncomment if needed and implement accordingly

    // Fetching G/L entries from the V2 API since the last sync
    const v2GLEntries = await this.v2ApiService.getGeneralLedgerEntries(lastSync);
    this.logger.debug(`Fetched ${v2GLEntries.length} general ledger entries from V2 API`);

    // Transform and save each G/L entry
    for (const v2GLEntry of v2GLEntries) {
      const glEntity = this.transformV2GeneralLedgerEntry(v2GLEntry);
      await this.generalLedgerEntryRepository.save(glEntity);
    }

    // No need to handle deletions as G/L entries are not deleted in Dynamics

    // Update the last sync timestamp after successful synchronization
    await this.updateLastSyncTimestamp(entityName);
    this.logger.debug(`Synchronization of general ledger entries completed.`);
  } catch (error) {
    this.logger.error('Error during general ledger entry synchronization', error);
    throw error;
  }
}

private transformV2GeneralLedgerEntry(data: any): GeneralLedgerEntry {
  const glEntry = new GeneralLedgerEntry();

  glEntry.id = data.id;
  glEntry.entryNumber = data.entryNumber ?? null;
  glEntry.postingDate = data.postingDate ? this.parseDateString(data.postingDate) : null;
  glEntry.documentNumber = data.documentNumber ?? null;
  glEntry.documentType = data.documentType ?? null;
  glEntry.accountId = data.accountId && data.accountId !== '00000000-0000-0000-0000-000000000000' ? data.accountId : null;
  glEntry.accountNumber = data.accountNumber ?? null;
  glEntry.description = data.description ?? null;
  glEntry.debitAmount = data.debitAmount ?? null;
  glEntry.creditAmount = data.creditAmount ?? null;
  glEntry.additionalCurrencyDebitAmount = data.additionalCurrencyDebitAmount ?? null;
  glEntry.additionalCurrencyCreditAmount = data.additionalCurrencyCreditAmount ?? null;
  glEntry.lastModifiedDateTime = data.lastModifiedDateTime ? new Date(data.lastModifiedDateTime) : null;
  glEntry.apiSource = 'v2.0';

  return glEntry;
}

// ----------------------------------
// Customer Ledger Entries Synchronization
// ----------------------------------
// -------------------------------
// Customer Ledger Entries Synchronization
// -------------------------------
async syncCustomerLedgerEntries(fullSync: boolean = false) {
  this.logger.debug(`Synchronizing customer ledger entries (fullSync=${fullSync})...`);
  const entityName = 'customer_ledger_entry';
  try {
    // Ensure that customers are synchronized before customer ledger entries
    await this.syncCustomers(fullSync);

    const lastSync = fullSync ? null : await this.getLastSyncTimestamp(entityName);

    const tmcCustLedgerEntries = await this.tmcApiService.getCustomerLedgerEntries(lastSync);
    this.logger.debug(`Fetched ${tmcCustLedgerEntries.length} customer ledger entries from TMC API`);

    for (const tmcEntry of tmcCustLedgerEntries) {
      const custLedgerEntity = this.transformTmcCustomerLedgerEntry(tmcEntry);
      await this.customerLedgerEntryRepository.save(custLedgerEntity);
    }

    // No deletion logic needed since customer ledger entries are not deleted in Dynamics

    await this.updateLastSyncTimestamp(entityName);
  } catch (error) {
    this.logger.error('Error during customer ledger entry synchronization', error.stack);
    throw error;
  }
}
private transformTmcCustomerLedgerEntry(data: any): CustomerLedgerEntry {
  return this.customerLedgerEntryRepository.create({
    entryNo: data.entryNo,
    acceptedPaymentTolerance: data.acceptedPaymentTolerance,
    acceptedPmtDiscTolerance: data.acceptedPmtDiscTolerance,
    adjustedCurrencyFactor: data.adjustedCurrencyFactor,
    amount: data.amount,
    amountLCY: data.amountLCY,
    amountToApply: data.amountToApply,
    appliesToDocNo: data.appliesToDocNo || null,
    appliesToDocType: data.appliesToDocType || null,
    appliesToExtDocNo: data.appliesToExtDocNo || null,
    appliesToID: data.appliesToID || null,
    applyingEntry: data.applyingEntry,
    balAccountNo: data.balAccountNo || null,
    balAccountType: data.balAccountType || null,
    cfdiCancellationReasonCode: data.cfdiCancellationReasonCode || null,
    calculateInterest: data.calculateInterest,
    certificateSerialNo: data.certificateSerialNo || null,
    closedAtDate: data.closedAtDate ? new Date(data.closedAtDate) : null,
    closedByAmount: data.closedByAmount,
    closedByAmountLCY: data.closedByAmountLCY,
    closedByCurrencyAmount: data.closedByCurrencyAmount,
    closedByCurrencyCode: data.closedByCurrencyCode || null,
    closedByEntryNo: data.closedByEntryNo,
    closingInterestCalculated: data.closingInterestCalculated,
    creditAmount: data.creditAmount,
    currencyCode: data.currencyCode || null,
    customerName: data.customerName || null,
    customerNo: data.customerNo || null,
    customerPostingGroup: data.customerPostingGroup || null,
    dateTimeCanceled: data.dateTimeCanceled || null,
    dateTimeFirstReqSent: data.dateTimeFirstReqSent || null,
    dateTimeSent: data.dateTimeSent || null,
    dateTimeStamped: data.dateTimeStamped || null,
    debitAmount: data.debitAmount,
    description: data.description || null,
    digitalStampPAC: data.digitalStampPAC || null,
    digitalStampSAT: data.digitalStampSAT || null,
    dimensionSetID: data.dimensionSetID,
    directDebitMandateID: data.directDebitMandateID || null,
    documentDate: data.documentDate ? new Date(data.documentDate) : null,
    documentNo: data.documentNo || null,
    documentType: data.documentType || null,
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
    electronicDocumentSent: data.electronicDocumentSent,
    electronicDocumentStatus: data.electronicDocumentStatus || null,
    errorCode: data.errorCode || null,
    errorDescription: data.errorDescription || null,
    exportedToPaymentFile: data.exportedToPaymentFile,
    externalDocumentNo: data.externalDocumentNo || null,
    fiscalInvoiceNumberPAC: data.fiscalInvoiceNumberPAC || null,
    globalDimension1Code: data.globalDimension1Code || null,
    globalDimension2Code: data.globalDimension2Code || null,
    // Map additional properties as needed
    postingDate: data.postingDate ? new Date(data.postingDate) : null,
    remainingAmount: data.remainingAmount,
    remainingAmtLCY: data.remainingAmtLCY,
    systemCreatedAt: data.systemCreatedAt ? new Date(data.systemCreatedAt) : null,
    lastModifiedDateTime: data.lastModifiedDateTime ? new Date(data.lastModifiedDateTime) : null,
    apiSource: 'tmc',
  });
}

// ----------------------------------
  // Synchronization Timestamp Methods
  // ----------------------------------

  private async getLastSyncTimestamp(entityName: string): Promise<Date> {
    const syncStatus = await this.syncStatusRepository.findOne({ where: { entityName } });
    if (syncStatus && syncStatus.lastSyncDateTime) {
      return syncStatus.lastSyncDateTime;
    }
    // Return a default date if no sync has occurred yet
    return new Date('1900-01-01T00:00:00Z');
  }

  private async updateLastSyncTimestamp(entityName: string): Promise<void> {
    const currentDateTime = new Date();
    let syncStatus = await this.syncStatusRepository.findOne({ where: { entityName } });
    if (!syncStatus) {
      syncStatus = this.syncStatusRepository.create({
        entityName,
        lastSyncDateTime: currentDateTime,
      });
    } else {
      syncStatus.lastSyncDateTime = currentDateTime;
    }
    await this.syncStatusRepository.save(syncStatus);
  }

// ----------------------------------
// Account Synchronization
// ----------------------------------
async syncAccounts(fullSync: boolean = false) {
  this.logger.debug(`Synchronizing accounts (fullSync=${fullSync})...`);
  const entityName = 'account'; // Match the entity name accurately
  try {
    const lastSync = fullSync ? null : await this.getLastSyncTimestamp(entityName);

    // Fetch accounts from V2 API, passing the last sync timestamp if not a full sync
    const accounts = await this.v2ApiService.getAccounts(lastSync);
    this.logger.debug(`Fetched ${accounts.length} accounts from V2 API`);

    for (const accountData of accounts) {
      const accountEntity = this.transformV2Account(accountData);
      await this.accountRepository.save(accountEntity);
      this.logger.debug(`Saved account ${accountEntity.number} to database`);
    }

    // Since accounts are not deleted in Dynamics, no deletion logic is necessary

    // Update the last sync timestamp for accounts
    await this.updateLastSyncTimestamp(entityName);
  } catch (error) {
    this.logger.error('Error during accounts synchronization', error.stack);
    throw error;
  }
}

// Transformation method
private transformV2Account(data: any): Account {
  return this.accountRepository.create({
    id: data.id,
    number: data.number,
    displayName: data.displayName || null,
    category: data.category || null,
    subCategory: data.subCategory || null,
    blocked: data.blocked != null ? data.blocked : null,
    accountType: data.accountType || null,
    directPosting: data.directPosting != null ? data.directPosting : null,
    netChange: data.netChange != null ? parseFloat(data.netChange) : null,
    consolidationTranslationMethod: data.consolidationTranslationMethod || null,
    consolidationDebitAccount: data.consolidationDebitAccount || null,
    consolidationCreditAccount: data.consolidationCreditAccount || null,
    excludeFromConsolidation: data.excludeFromConsolidation != null ? data.excludeFromConsolidation : null,
    lastModifiedDateTime: data.lastModifiedDateTime ? new Date(data.lastModifiedDateTime) : null,
    apiSource: 'v2.0',
  });
}

// ----------------------------------
// Bank Account Synchronization
// ----------------------------------
async syncBankAccounts(fullSync: boolean = false) {
  this.logger.debug(`Synchronizing bank accounts (fullSync=${fullSync})...`);
  const entityName = 'bank_account'; // Updated to match the entity/table name
  try {
    const lastSync = fullSync ? null : await this.getLastSyncTimestamp(entityName);

    const bankAccounts = await this.v2ApiService.getBankAccounts(lastSync);
    this.logger.debug(`Fetched ${bankAccounts.length} bank accounts from V2 API`);

    for (const bankAccountData of bankAccounts) {
      const bankAccountEntity = this.transformV2BankAccount(bankAccountData);
      await this.bankAccountRepository.save(bankAccountEntity);
      this.logger.debug(`Saved bank account ${bankAccountEntity.number} to database`);
    }

    // No need for deletion logic since bank accounts are not deleted in Dynamics

    await this.updateLastSyncTimestamp(entityName);
  } catch (error) {
    this.logger.error('Error during bank account synchronization', error.stack);
    throw error;
  }
}

// Transformation method
private transformV2BankAccount(data: any): BankAccount {
  return this.bankAccountRepository.create({
    id: data.id,
    number: data.number,
    displayName: data.displayName,
    bankAccountNumber: data.bankAccountNumber || null,
    blocked: data.blocked !== undefined ? data.blocked : null,
    currencyCode: data.currencyCode || null,
    currencyId:
      data.currencyId && data.currencyId !== '00000000-0000-0000-0000-000000000000' ? data.currencyId : null,
    iban: data.iban || null,
    intercompanyEnabled:
      data.intercompanyEnabled !== undefined ? data.intercompanyEnabled : null,
    lastModifiedDateTime: data.lastModifiedDateTime ? new Date(data.lastModifiedDateTime) : null,
    apiSource: 'v2.0',
  });
}

// ----------------------------------
// Ship-to Address Synchronization
// ----------------------------------
async syncShipToAddresses(fullSync: boolean = false) {
  this.logger.debug(`Synchronizing ship-to addresses (fullSync=${fullSync})...`);
  const entityName = 'ship_to_address';
  try {
    const lastSync = fullSync ? null : await this.getLastSyncTimestamp(entityName);

    // Fetch ship-to addresses from the TMC API
    const shipToAddresses = await this.tmcApiService.getShipToAddresses(lastSync);
    this.logger.debug(`Fetched ${shipToAddresses.length} ship-to addresses from TMC API`);

    for (const data of shipToAddresses) {
      const customerNo = data.customerNo;

      // Handle or skip ship-to addresses where customerNo is "1"
      if (customerNo === '1') {
        this.logger.debug(`Skipping ship-to address ${data.code} with customerNo "1"`);
        continue;
      }

      // Ensure customer exists before processing the ship-to address
      const customerExists = await this.ensureCustomerExistsByNumber(customerNo);
      if (!customerExists) {
        // Skip processing this ship-to address
        this.logger.warn(`Customer number ${customerNo} not found. Skipping ship-to address ${data.code}.`);
        continue;
      }

      // Transform and save the ship-to address
      const shipToEntity = this.transformShipToAddress(data);
      await this.shipToAddressRepository.save(shipToEntity);
      this.logger.debug(
        `Saved ship-to address ${shipToEntity.code} for customer number ${shipToEntity.customerNo}`
      );
    }

    // Update the last sync timestamp
    await this.updateLastSyncTimestamp(entityName);
  } catch (error) {
    this.logger.error('Error during ship-to address synchronization', error.stack);
    throw error;
  }
}
private transformShipToAddress(data: any): ShipToAddress {
  return this.shipToAddressRepository.create({
    customerNo: data.customerNo,
    code: data.code,
    systemId: data.systemId || null,
    name: data.name ? data.name.substring(0, 100) : null,
    name2: data.name2 ? data.name2.substring(0, 50) : null,
    address: data.address ? data.address.substring(0, 100) : null,
    address2: data.address2 ? data.address2.substring(0, 50) : null,
    postCode: data.postCode ? data.postCode.substring(0, 20) : null,
    city: data.city ? data.city.substring(0, 30) : null,
    state: data.state ? data.state.substring(0, 30) : null,
    countryRegionCode: data.countryRegionCode ? data.countryRegionCode.substring(0, 10) : null,
    email: data.eMail ? data.eMail.substring(0, 80) : null,
    phoneNo: data.phoneNo ? data.phoneNo.substring(0, 30) : null,
    faxNo: data.faxNo ? data.faxNo.substring(0, 30) : null,
    contact: data.contact ? data.contact.substring(0, 100) : null,
    gln: data.gln ? data.gln.substring(0, 13) : null,
    cissdmCrossReferenceCode: data.cissdmCrossReferenceCode ? data.cissdmCrossReferenceCode.substring(0, 20) : null,
    cissdmCustomerCostCenterCode: data.cissdmCustomerCostCenterCode ? data.cissdmCustomerCostCenterCode.substring(0, 20) : null,
    systemCreatedAt: data.SystemCreatedAt ? new Date(data.SystemCreatedAt) : null,
    lastModifiedDateTime: data.lastModifiedDateTime ? new Date(data.lastModifiedDateTime) : null,
    apiSource: 'tmc',
  });
}

// ----------------------------------
// Job Synchronization
// ----------------------------------
async syncJobs(fullSync: boolean = false) {
  this.logger.debug(`Synchronizing jobs (fullSync=${fullSync})...`);
  const entityName = 'job';
  try {
    const lastSync = fullSync ? null : await this.getLastSyncTimestamp(entityName);

    const jobs = await this.tmcApiService.getJobs(lastSync);
    this.logger.debug(`Fetched ${jobs.length} jobs from TMC API`);

    for (const data of jobs) {
      // Ensure customer exists if applicable
      if (data.billToCustomerNo) {
        await this.ensureCustomerExistsByBillToCustomerNo(data.billToCustomerNo);
      }

      const jobEntity = this.transformJob(data);
      await this.jobRepository.save(jobEntity);
      this.logger.debug(`Saved job ${jobEntity.no} to database`);
    }

    // Jobs are not deleted in Dynamics, so no deletion logic is necessary

    await this.updateLastSyncTimestamp(entityName);
  } catch (error) {
    this.logger.error('Error during job synchronization', error.stack);
    throw error;
  }
}

private transformJob(data: any): Job {
  return this.jobRepository.create({
    no: data.no,
    systemId: data.systemId || null,
    description: data.description || null,
    billToCustomerNo: data.billToCustomerNo || null,
    status: data.status || null,
    personResponsible: data.personResponsible || null,
    nextInvoiceDate:
      data.nextInvoiceDate && data.nextInvoiceDate !== '0001-01-01'
        ? new Date(data.nextInvoiceDate)
        : null,
    jobPostingGroup: data.jobPostingGroup || null,
    searchDescription: data.searchDescription || null,
    systemCreatedAt: data.SystemCreatedAt ? new Date(data.SystemCreatedAt) : null,
    lastModifiedDateTime: data.lastModifiedDateTime ? new Date(data.lastModifiedDateTime) : null,
    apiSource: 'tmc',
  });
}

// ----------------------------------
// Billing Schedule Line Synchronization
// ----------------------------------
async syncBillingScheduleLines(fullSync: boolean = false) {
  this.logger.debug(`Synchronizing billing schedule lines (fullSync=${fullSync})...`);

  try {
    // Fetch all billing schedule lines from the TMC API
    const billingScheduleLines = await this.tmcApiService.getBillingScheduleLines();
    this.logger.debug(`Fetched ${billingScheduleLines.length} billing schedule lines from TMC API`);

    // Optional: Clear existing data to avoid duplicates or outdated records
    await this.billingScheduleLineRepository.clear();
    this.logger.debug('Cleared existing billing schedule lines from database');

    // Save fetched billing schedule lines
    for (const data of billingScheduleLines) {
      // Transform API data into BillingScheduleLine entity
      const billingLineEntity = this.transformBillingScheduleLine(data);

      // Save the entity to the database
      await this.billingScheduleLineRepository.save(billingLineEntity);
      this.logger.debug(
        `Saved billing schedule line ${billingLineEntity.bssiArcbBillingScheduleNumber} - ${billingLineEntity.lineNo} to database`
      );
    }

    // No need to update last sync timestamp since we're fetching all records
  } catch (error) {
    this.logger.error('Error during billing schedule line synchronization', error.stack);
    throw error;
  }
}

private transformBillingScheduleLine(data: any): BillingScheduleLine {
  return this.billingScheduleLineRepository.create({
    bssiArcbBillingScheduleNumber: data.BssiArcbBillingScheduleNumber,
    lineNo: data.LineNo,
    type: data.Type_,
    itemNo: data.ItemNo || null,
    description: data.Description || null,
    billingType: data.BillingType || null,
    locationCode: data.LocationCode || null,
    unitMeasureCode: data.UnitMeasureCode || null,
    pricingMethod: data.PricingMethod || null,
    price: data.Price || null,
    qty: data.Qty || null,
    amount: data.Amount || null,
    billingFrequency: data.BillingFrequency || null,
    billingStartDate: data.BillingStartDate ? new Date(data.BillingStartDate) : null,
    billingEndDate: data.BillingEndDate ? new Date(data.BillingEndDate) : null,
    interval: data.Interval || null,
    taxGroupCode: data.TaxGroupCode || null,
    taxLiable: data.TaxLiable || null,
    taxAreadCode: data.TaxAreadCode || null,
    autoRenewed: data.AutoRenewed || null,
    usageOption: data.UsageOption || null,
    usageIdentifier: data.UsageIdentifier || null,
    initialReading: data.InitialReading || null,
    renewalLines: data.RenewalLines || null,
    revenueSplit: data.RevenueSplit || null,
    parentAmount: data.ParentAmount || null,
    bssiCalculationMethod: data.BssiCalculationMethod || null,
    bssiDayofInvoiceDate: data.BssiDayofInvoiceDate || null,
    bssiNumofPeriod: data.BssiNumofPeriod || null,
    bssiAlignmentDate: data.BssiAlignmentDate ? new Date(data.BssiAlignmentDate) : null,
    bssiEstimatedQty: data.BssiEstimatedQty || null,
    bssiStatus: data.BssiStatus || null,
    bssiUdfL1: data.Bssi_UDF_L1 || null,
    bssiUdfL2: data.Bssi_UDF_L2 || null,
    bssiUdfL3: data.Bssi_UDF_L3 || null,
    bssiUdfL4: data.Bssi_UDF_L4 || null,
    bssiUdfL5: data.Bssi_UDF_L5 || null,
    bssiUdfL6: data.Bssi_UDF_L6 ? new Date(data.Bssi_UDF_L6) : null,
    bssiUdfL7: data.Bssi_UDF_L7 || null,
    bssiUdfL8: data.Bssi_UDF_L8 || null,
    bssiUdfL9: data.Bssi_UDF_L9 || null,
    bssiUdfL10: data.Bssi_UDF_L10 || null,
    bssiUdfL11: data.Bssi_UDF_L11 || null,
    bssiUdfL12: data.Bssi_UDF_L12 || null,
    bssiUdfL13: data.Bssi_UDF_L13 || null,
    bssiUdfL14: data.Bssi_UDF_L14 ? new Date(data.Bssi_UDF_L14) : null,
    bssiUdfL15: data.Bssi_UDF_L15 ? new Date(data.Bssi_UDF_L15) : null,
    bssiUdfL16: data.Bssi_UDF_L16 ? new Date(data.Bssi_UDF_L16) : null,
    bssiUdfL17: data.Bssi_UDF_L17 ? new Date(data.Bssi_UDF_L17) : null,
    bssiUdfL18: data.Bssi_UDF_L18 || null,
    bssiUdfL19: data.Bssi_UDF_L19 || null,
    shortcutDimension1Code: data.ShortcutDimension1Code || null,
    shortcutDimension2Code: data.ShortcutDimension2Code || null,
    bssiShortcutDimension3: data.BssiShortcutDimension3 || null,
    bssiShortcutDimension4: data.BssiShortcutDimension4 || null,
    bssiShortcutDimension5: data.BssiShortcutDimension5 || null,
    bssiShortcutDimension6: data.BssiShortcutDimension6 || null,
    bssiShortcutDimension7: data.BssiShortcutDimension7 || null,
    bssiShortcutDimension8: data.BssiShortcutDimension8 || null,
    bssiAccumulateImport: data.BssiAccumulateImport || null,
    shiptoCode: data.ShiptoCode || null,
    apiSource: 'tmc',
  });
}

// ----------------------------------
  // Helper Methods
  // ----------------------------------

  private async ensureCustomerExists(customerId: string): Promise<void> {
    // Check if customer exists in local database
    const customerExists = await this.customerRepository.findOne({ where: { id: customerId } });
    if (!customerExists) {
      this.logger.debug(`Customer ${customerId} not found locally. Fetching from API.`);

      // Fetch customer data from API
      const customerData = await this.v2ApiService.getCustomerById(customerId);
      if (customerData) {
        // Transform and save customer
        const customerEntity = this.transformV2Customer(customerData);
        await this.customerRepository.save(customerEntity);
        this.logger.debug(`Saved customer ${customerData.number} to database.`);
      } else {
        this.logger.error(`Customer ${customerId} not found in API. Cannot proceed.`);
        throw new Error(`Customer ${customerId} not found. Cannot proceed with synchronization.`);
      }
    }
  }

  private async ensureCustomerExistsByNumber(customerNo: string): Promise<boolean> {
    // Check if the customer exists in the database by customer number
    const customerExists = await this.customerRepository.findOne({ where: { customerNumber: customerNo } });
    if (!customerExists) {
      // Customer not found in the database, fetch from API by customer number
      const customerData = await this.v2ApiService.getCustomerByNumber(customerNo);
      if (customerData) {
        const customerEntity = this.transformV2Customer(customerData);
        await this.customerRepository.save(customerEntity);
        this.logger.debug(`Saved customer ${customerEntity.customerNumber} to database`);
        return true;
      } else {
        this.logger.warn(`Customer number ${customerNo} not found in API.`);
        return false;
      }
    }
    return true;
  }

  private async ensureCustomerExistsByBillToCustomerNo(billToCustomerNo: string): Promise<boolean> {
    // Check if the customer exists in the database by customer number
    const customerExists = await this.customerRepository.findOne({ where: { customerNumber: billToCustomerNo } });
    if (!customerExists) {
      this.logger.debug(`Customer number ${billToCustomerNo} not found locally. Fetching from API.`);
  
      // Customer not found in the database, fetch from API by customer number
      const customerData = await this.v2ApiService.getCustomerByNumber(billToCustomerNo);
      if (customerData) {
        const customerEntity = this.transformV2Customer(customerData);
        await this.customerRepository.save(customerEntity);
        this.logger.debug(`Saved customer ${customerEntity.customerNumber} to database`);
        return true;
      } else {
        this.logger.warn(`Customer number ${billToCustomerNo} not found in API.`);
        return false;
      }
    }
    return true;
  }

  private async ensureVendorExists(vendorId: string): Promise<void> {
    // Check if vendor exists in local database
    const vendorExists = await this.vendorRepository.findOne({ where: { id: vendorId } });
    if (!vendorExists) {
      this.logger.debug(`Vendor ${vendorId} not found locally. Fetching from API.`);

      // Fetch vendor data from API
      const vendorData = await this.v2ApiService.getVendorById(vendorId);
      if (vendorData) {
        // Transform and save vendor
        const vendorEntity = this.transformV2Vendor(vendorData);
        await this.vendorRepository.save(vendorEntity);
        this.logger.debug(`Saved vendor ${vendorData.number} to database.`);
      } else {
        this.logger.error(`Vendor ${vendorId} not found in API. Cannot proceed.`);
        throw new Error(`Vendor ${vendorId} not found. Cannot proceed with synchronization.`);
      }
    }
  }

  // Helper function to parse date strings
  private parseDateString(dateString: string): Date | null {
    if (!dateString || dateString === '0001-01-01') {
      return null;
    }
  
    // Check if the string includes a time component
    if (dateString.length > 10) {
      // Parse as date-time string
      return new Date(dateString);
    } else {
      // Parse as date string in 'YYYY-MM-DD' format
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
  }

// Helper function to transform zero GUIDs to null
private transformNullableGuid(guid: string): string | null {
  if (guid && guid !== '00000000-0000-0000-0000-000000000000') {
    return guid;
  }
  return null;
}



}


