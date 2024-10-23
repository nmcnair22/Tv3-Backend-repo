// src/modules/sync/sync.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

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
      await this.syncCustomers(fullSync);
      await this.syncVendors(fullSync);
      await this.syncItems(fullSync);
      await this.syncSalesInvoices(fullSync);
      await this.syncSalesCreditMemos(fullSync);
      await this.syncPurchaseInvoices(fullSync);
      await this.syncPurchaseOrders(fullSync);
      await this.syncPurchaseCreditMemos(fullSync);
      await this.syncGeneralLedgerEntries(fullSync);
      await this.syncCustomerLedgerEntries(fullSync);
      // Include any other sync methods, passing fullSync
      await this.syncAccounts(fullSync);
      await this.syncBankAccounts(fullSync);
      await this.syncShipToAddresses(fullSync);
      await this.syncJobs(fullSync);
      // Note: For syncBillingScheduleLines, which always performs a full sync
      await this.syncBillingScheduleLines(); // No need to pass fullSync
  
      this.logger.debug('Synchronization completed successfully.');
    } catch (error) {
    const err = error as any;
      this.logger.error('Synchronization failed', err.stack);
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
      const dynamicsIds = new Set();
  
      for (const v2Customer of v2Customers) {
        const customerEntity = this.transformV2Customer(v2Customer);
        await this.customerRepository.save(customerEntity);
        dynamicsIds.add(customerEntity.id);
        this.logger.debug(`Saved customer ${customerEntity.customerNumber} to database`);
      }
  
      // Remove the TMC Customers synchronization section
  
      // Optional: Handle deletions during full sync
      if (fullSync) {
        const localCustomers = await this.customerRepository.find({ select: ['id'] });
        const localIds = localCustomers.map(c => c.id);
  
        const idsToDelete = localIds.filter(id => !dynamicsIds.has(id));
  
        if (idsToDelete.length > 0) {
          await this.customerRepository.delete(idsToDelete);
          this.logger.debug(`Deleted ${idsToDelete.length} customers not present in Dynamics`);
        }
      }
  
      await this.updateLastSyncTimestamp(entityName);
    } catch (error) {
      const err = error as any;
      this.logger.error('Error during customer synchronization', err.stack);
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

// ----------------------------------
// Vendor Synchronization
// ----------------------------------
async syncVendors(fullSync: boolean = false) {
  this.logger.debug(`Synchronizing vendors (fullSync=${fullSync})...`);
  const entityName = 'vendors';
  try {
    const lastSync = fullSync ? null : await this.getLastSyncTimestamp(entityName);

    const v2Vendors = await this.v2ApiService.getVendors(lastSync);
    this.logger.debug(`Fetched ${v2Vendors.length} vendors from V2 API`);

    for (const v2Vendor of v2Vendors) {
      const vendorEntity = this.transformV2Vendor(v2Vendor);
      await this.vendorRepository.save(vendorEntity);
      this.logger.debug(`Saved vendor ${vendorEntity.vendorNumber} to database`);
    }

    // Optional: Handle deletions during full sync
    if (fullSync) {
      const dynamicsIds = v2Vendors.map(v => v.id);
      const localVendors = await this.vendorRepository.find({ select: ['id'] });
      const localIds = localVendors.map(v => v.id);

      const idsToDelete = localIds.filter(id => !dynamicsIds.includes(id));

      if (idsToDelete.length > 0) {
        await this.vendorRepository.delete(idsToDelete);
        this.logger.debug(`Deleted ${idsToDelete.length} vendors not present in Dynamics`);
      }
    }

    await this.updateLastSyncTimestamp(entityName);
  } catch (error) {
    const err = error as any;
    this.logger.error('Error during vendor synchronization', err.stack);
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
    paymentTermsId:
      data.paymentTermsId !== '00000000-0000-0000-0000-000000000000'
        ? data.paymentTermsId
        : null,
    paymentMethodId:
      data.paymentMethodId !== '00000000-0000-0000-0000-000000000000'
        ? data.paymentMethodId
        : null,
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
async syncItems(fullSync: boolean = false) {
  this.logger.debug(`Synchronizing items (fullSync=${fullSync})...`);
  const entityName = 'items';
  try {
    const lastSync = fullSync ? null : await this.getLastSyncTimestamp(entityName);

    const v2Items = await this.v2ApiService.getItems(lastSync);
    this.logger.debug(`Fetched ${v2Items.length} items from V2 API`);

    for (const v2Item of v2Items) {
      const itemEntity = this.transformV2Item(v2Item);
      await this.itemRepository.save(itemEntity);
      this.logger.debug(`Saved item ${itemEntity.itemNo} to database`);
    }

    // Optional: Handle deletions during full sync
    if (fullSync) {
      const dynamicsIds = v2Items.map(item => item.id);
      const localItems = await this.itemRepository.find({ select: ['id'] });
      const localIds = localItems.map(item => item.id);

      const idsToDelete = localIds.filter(id => !dynamicsIds.includes(id));

      if (idsToDelete.length > 0) {
        await this.itemRepository.delete(idsToDelete);
        this.logger.debug(`Deleted ${idsToDelete.length} items not present in Dynamics`);
      }
    }

    await this.updateLastSyncTimestamp(entityName);
  } catch (error) {
    const err = error as any;
    this.logger.error('Error during item synchronization', err.stack);
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
    lastModified: new Date(data.lastModifiedDateTime),
    apiSource: 'v2.0',
  });
}

// ----------------------------------
// Sales Invoice Synchronization
// ----------------------------------
async syncSalesInvoices(fullSync: boolean = false) {
  this.logger.debug(`Synchronizing sales invoices (fullSync=${fullSync})...`);
  const entityName = 'sales_invoices';
  try {
    const lastSync = fullSync ? null : await this.getLastSyncTimestamp(entityName);

    const v2SalesInvoices = await this.v2ApiService.getSalesInvoices(lastSync);
    this.logger.debug(`Fetched ${v2SalesInvoices.length} sales invoices from V2 API`);

    for (const v2Invoice of v2SalesInvoices) {
      const invoiceEntity = this.transformV2SalesInvoice(v2Invoice);
      await this.salesInvoiceRepository.save(invoiceEntity);
      this.logger.debug(`Saved sales invoice ${invoiceEntity.invoiceNumber} to database`);

      // Fetch and sync sales invoice lines
      const v2InvoiceLines = await this.v2ApiService.getSalesInvoiceLines(v2Invoice.id);
      this.logger.debug(
        `Fetched ${v2InvoiceLines.length} sales invoice lines for invoice ${invoiceEntity.invoiceNumber} from V2 API`
      );

      for (const v2Line of v2InvoiceLines) {
        const lineEntity = this.transformV2SalesInvoiceLine(v2Line, invoiceEntity.id);
        await this.salesInvoiceLineRepository.save(lineEntity);
        this.logger.debug(`Saved sales invoice line ${lineEntity.id} to database`);
      }
    }

    // Optional: Handle deletions during full sync
    if (fullSync) {
      // For sales invoices
      const dynamicsInvoiceIds = v2SalesInvoices.map(inv => inv.id);
      const localInvoices = await this.salesInvoiceRepository.find({ select: ['id'] });
      const localInvoiceIds = localInvoices.map(inv => inv.id);

      const invoicesToDelete = localInvoiceIds.filter(id => !dynamicsInvoiceIds.includes(id));

      if (invoicesToDelete.length > 0) {
        await this.salesInvoiceRepository.delete(invoicesToDelete);
        this.logger.debug(`Deleted ${invoicesToDelete.length} sales invoices not present in Dynamics`);

        // Delete related invoice lines
        await this.salesInvoiceLineRepository.delete({ salesInvoiceId: In(invoicesToDelete) });
        this.logger.debug(`Deleted sales invoice lines related to deleted invoices`);
      }
    }

    await this.updateLastSyncTimestamp(entityName);
  } catch (error) {
    const err = error as any;
    this.logger.error('Error during sales invoice synchronization', err.stack);
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
async syncSalesCreditMemos(fullSync: boolean = false) {
  this.logger.debug(`Synchronizing sales credit memos (fullSync=${fullSync})...`);
  const entityName = 'sales_credit_memos';
  try {
    const lastSync = fullSync ? null : await this.getLastSyncTimestamp(entityName);

    const v2CreditMemos = await this.v2ApiService.getSalesCreditMemos(lastSync);
    this.logger.debug(`Fetched ${v2CreditMemos.length} sales credit memos from V2 API`);

    for (const v2Memo of v2CreditMemos) {
      const memoEntity = this.transformV2SalesCreditMemo(v2Memo);
      await this.salesCreditMemoRepository.save(memoEntity);
      this.logger.debug(`Saved sales credit memo ${memoEntity.number} to database`);

      // Fetch and sync sales credit memo lines
      const v2MemoLines = await this.v2ApiService.getSalesCreditMemoLines(v2Memo.id);
      this.logger.debug(
        `Fetched ${v2MemoLines.length} sales credit memo lines for memo ${memoEntity.number} from V2 API`
      );

      for (const v2Line of v2MemoLines) {
        const lineEntity = this.transformV2SalesCreditMemoLine(v2Line, memoEntity.id);
        await this.salesCreditMemoLineRepository.save(lineEntity);
        this.logger.debug(`Saved sales credit memo line ${lineEntity.id} to database`);
      }
    }

    // Optional: Handle deletions during full sync
    if (fullSync) {
      const dynamicsMemoIds = v2CreditMemos.map(memo => memo.id);
      const localMemos = await this.salesCreditMemoRepository.find({ select: ['id'] });
      const localMemoIds = localMemos.map(memo => memo.id);

      const memosToDelete = localMemoIds.filter(id => !dynamicsMemoIds.includes(id));

      if (memosToDelete.length > 0) {
        await this.salesCreditMemoRepository.delete(memosToDelete);
        this.logger.debug(`Deleted ${memosToDelete.length} sales credit memos not present in Dynamics`);

        // Delete related memo lines
        await this.salesCreditMemoLineRepository.delete({ salesCreditMemoId: In(memosToDelete) });
        this.logger.debug(`Deleted sales credit memo lines related to deleted memos`);
      }
    }

    await this.updateLastSyncTimestamp(entityName);
  } catch (error) {
    const err = error as any;
    this.logger.error('Error during sales credit memo synchronization', err.stack);
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
async syncPurchaseInvoices(fullSync: boolean = false) {
  this.logger.debug(`Synchronizing purchase invoices (fullSync=${fullSync})...`);
  const entityName = 'purchase_invoices';
  try {
    const lastSync = fullSync ? null : await this.getLastSyncTimestamp(entityName);

    const v2PurchaseInvoices = await this.v2ApiService.getPurchaseInvoices(lastSync);
    this.logger.debug(`Fetched ${v2PurchaseInvoices.length} purchase invoices from V2 API`);

    for (const v2Invoice of v2PurchaseInvoices) {
      const invoiceEntity = this.transformV2PurchaseInvoice(v2Invoice);
      await this.purchaseInvoiceRepository.save(invoiceEntity);
      this.logger.debug(`Saved purchase invoice ${invoiceEntity.number} to database`);

      // Fetch and sync purchase invoice lines
      const v2InvoiceLines = await this.v2ApiService.getPurchaseInvoiceLines(v2Invoice.id);
      this.logger.debug(
        `Fetched ${v2InvoiceLines.length} purchase invoice lines for invoice ${invoiceEntity.number} from V2 API`
      );

      for (const v2Line of v2InvoiceLines) {
        const lineEntity = this.transformV2PurchaseInvoiceLine(v2Line, invoiceEntity.id);
        await this.purchaseInvoiceLineRepository.save(lineEntity);
        this.logger.debug(`Saved purchase invoice line ${lineEntity.id} to database`);
      }
    }

    // Optional: Handle deletions during full sync
    if (fullSync) {
      const dynamicsInvoiceIds = v2PurchaseInvoices.map(inv => inv.id);
      const localInvoices = await this.purchaseInvoiceRepository.find({ select: ['id'] });
      const localInvoiceIds = localInvoices.map(inv => inv.id);

      const invoicesToDelete = localInvoiceIds.filter(id => !dynamicsInvoiceIds.includes(id));

      if (invoicesToDelete.length > 0) {
        await this.purchaseInvoiceRepository.delete(invoicesToDelete);
        this.logger.debug(`Deleted ${invoicesToDelete.length} purchase invoices not present in Dynamics`);

        // Delete related invoice lines
        await this.purchaseInvoiceLineRepository.delete({ purchaseInvoiceId: In(invoicesToDelete) });
        this.logger.debug(`Deleted purchase invoice lines related to deleted invoices`);
      }
    }

    await this.updateLastSyncTimestamp(entityName);
  } catch (error) {
    const err = error as any;
    this.logger.error('Error during purchase invoice synchronization', err.stack);
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
async syncPurchaseOrders(fullSync: boolean = false) {
  this.logger.debug(`Synchronizing purchase orders (fullSync=${fullSync})...`);
  const entityName = 'purchase_orders';
  try {
    const lastSync = fullSync ? null : await this.getLastSyncTimestamp(entityName);

    const v2PurchaseOrders = await this.v2ApiService.getPurchaseOrders(lastSync);
    this.logger.debug(`Fetched ${v2PurchaseOrders.length} purchase orders from V2 API`);

    for (const v2Order of v2PurchaseOrders) {
      const orderEntity = this.transformV2PurchaseOrder(v2Order);
      await this.purchaseOrderRepository.save(orderEntity);
      this.logger.debug(`Saved purchase order ${orderEntity.number} to database`);

      // Fetch and sync purchase order lines
      const v2OrderLines = await this.v2ApiService.getPurchaseOrderLines(v2Order.id);
      this.logger.debug(
        `Fetched ${v2OrderLines.length} purchase order lines for order ${orderEntity.number} from V2 API`
      );

      for (const v2Line of v2OrderLines) {
        const lineEntity = this.transformV2PurchaseOrderLine(v2Line, orderEntity.id);
        await this.purchaseOrderLineRepository.save(lineEntity);
        this.logger.debug(`Saved purchase order line ${lineEntity.id} to database`);
      }
    }

    // Optional: Handle deletions during full sync
    if (fullSync) {
      const dynamicsOrderIds = v2PurchaseOrders.map(order => order.id);
      const localOrders = await this.purchaseOrderRepository.find({ select: ['id'] });
      const localOrderIds = localOrders.map(order => order.id);

      const ordersToDelete = localOrderIds.filter(id => !dynamicsOrderIds.includes(id));

      if (ordersToDelete.length > 0) {
        await this.purchaseOrderRepository.delete(ordersToDelete);
        this.logger.debug(`Deleted ${ordersToDelete.length} purchase orders not present in Dynamics`);

        // Delete related order lines
        await this.purchaseOrderLineRepository.delete({ purchaseOrderId: In(ordersToDelete) });
        this.logger.debug(`Deleted purchase order lines related to deleted orders`);
      }
    }

    await this.updateLastSyncTimestamp(entityName);
  } catch (error) {
    const err = error as any;
    this.logger.error('Error during purchase order synchronization', err.stack);
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
async syncPurchaseCreditMemos(fullSync: boolean = false) {
  this.logger.debug(`Synchronizing purchase credit memos (fullSync=${fullSync})...`);
  const entityName = 'purchase_credit_memos';
  try {
    const lastSync = fullSync ? null : await this.getLastSyncTimestamp(entityName);

    const v2CreditMemos = await this.v2ApiService.getPurchaseCreditMemos(lastSync);
    this.logger.debug(`Fetched ${v2CreditMemos.length} purchase credit memos from V2 API`);

    for (const v2Memo of v2CreditMemos) {
      const memoEntity = this.transformV2PurchaseCreditMemo(v2Memo);
      await this.purchaseCreditMemoRepository.save(memoEntity);
      this.logger.debug(`Saved purchase credit memo ${memoEntity.number} to database`);

      // Fetch and sync purchase credit memo lines
      const v2MemoLines = await this.v2ApiService.getPurchaseCreditMemoLines(v2Memo.id);
      this.logger.debug(
        `Fetched ${v2MemoLines.length} purchase credit memo lines for memo ${memoEntity.number} from V2 API`
      );

      for (const v2Line of v2MemoLines) {
        const lineEntity = this.transformV2PurchaseCreditMemoLine(v2Line, memoEntity.id);
        await this.purchaseCreditMemoLineRepository.save(lineEntity);
        this.logger.debug(`Saved purchase credit memo line ${lineEntity.id} to database`);
      }
    }

    // Optional: Handle deletions during full sync
    if (fullSync) {
      const dynamicsMemoIds = v2CreditMemos.map(memo => memo.id);
      const localMemos = await this.purchaseCreditMemoRepository.find({ select: ['id'] });
      const localMemoIds = localMemos.map(memo => memo.id);

      const memosToDelete = localMemoIds.filter(id => !dynamicsMemoIds.includes(id));

      if (memosToDelete.length > 0) {
        await this.purchaseCreditMemoRepository.delete(memosToDelete);
        this.logger.debug(`Deleted ${memosToDelete.length} purchase credit memos not present in Dynamics`);

        // Delete related memo lines
        await this.purchaseCreditMemoLineRepository.delete({ purchaseCreditMemoId: In(memosToDelete) });
        this.logger.debug(`Deleted purchase credit memo lines related to deleted memos`);
      }
    }

    await this.updateLastSyncTimestamp(entityName);
  } catch (error) {
    const err = error as any;
    this.logger.error('Error during purchase credit memo synchronization', err.stack);
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
// G/L Entries Synchronization
// ----------------------------------
async syncGeneralLedgerEntries(fullSync: boolean = false) {
  this.logger.debug(`Synchronizing general ledger entries (fullSync=${fullSync})...`);
  const entityName = 'general_ledger_entries';
  try {
    const lastSync = fullSync ? null : await this.getLastSyncTimestamp(entityName);

    const v2GLEntries = await this.v2ApiService.getGeneralLedgerEntries(lastSync);
    this.logger.debug(`Fetched ${v2GLEntries.length} general ledger entries from V2 API`);

    for (const v2GLEntry of v2GLEntries) {
      const glEntity = this.transformV2GeneralLedgerEntry(v2GLEntry);
      await this.generalLedgerEntryRepository.save(glEntity);
    }

    // Optional: Handle deletions during full sync
    if (fullSync) {
      const dynamicsEntryIds = v2GLEntries.map(entry => entry.id);
      const localEntries = await this.generalLedgerEntryRepository.find({ select: ['id'] });
      const localEntryIds = localEntries.map(entry => entry.id);

      const entriesToDelete = localEntryIds.filter(id => !dynamicsEntryIds.includes(id));

      if (entriesToDelete.length > 0) {
        await this.generalLedgerEntryRepository.delete(entriesToDelete);
        this.logger.debug(`Deleted ${entriesToDelete.length} general ledger entries not present in Dynamics`);
      }
    }

    await this.updateLastSyncTimestamp(entityName);
  } catch (error) {
    const err = error as any;
    this.logger.error('Error during general ledger entry synchronization', err.stack);
    throw error;
  }
}

  private transformV2GeneralLedgerEntry(data: any): GeneralLedgerEntry {
    return this.generalLedgerEntryRepository.create({
      id: data.id,
      entryNumber: data.entryNumber,
      postingDate: new Date(data.postingDate),
      documentNumber: data.documentNumber || null,
      documentType: data.documentType || null,
      accountId: data.accountId !== '00000000-0000-0000-0000-000000000000' ? data.accountId : null,
      accountNumber: data.accountNumber || null,
      description: data.description || null,
      debitAmount: data.debitAmount,
      creditAmount: data.creditAmount,
      additionalCurrencyDebitAmount: data.additionalCurrencyDebitAmount,
      additionalCurrencyCreditAmount: data.additionalCurrencyCreditAmount,
      lastModified: new Date(data.lastModifiedDateTime),
      apiSource: 'v2.0',
    });
  }

// ----------------------------------
// Customer Ledger Entries Synchronization
// ----------------------------------
async syncCustomerLedgerEntries(fullSync: boolean = false) {
  this.logger.debug(`Synchronizing customer ledger entries (fullSync=${fullSync})...`);
  const entityName = 'customer_ledger_entries';
  try {
    const lastSync = fullSync ? null : await this.getLastSyncTimestamp(entityName);

    const tmcCustLedgerEntries = await this.tmcApiService.getCustomerLedgerEntries(lastSync);
    this.logger.debug(`Fetched ${tmcCustLedgerEntries.length} customer ledger entries from TMC API`);

    for (const tmcEntry of tmcCustLedgerEntries) {
      const custLedgerEntity = this.transformTmcCustomerLedgerEntry(tmcEntry);
      await this.customerLedgerEntryRepository.save(custLedgerEntity);
    }

    // Optional: Handle deletions during full sync
    if (fullSync) {
      // Assuming 'entryNo' is the unique identifier
      const dynamicsEntryNos = tmcCustLedgerEntries.map(entry => entry.entryNo);
      const localEntries = await this.customerLedgerEntryRepository.find({ select: ['entryNo'] });
      const localEntryNos = localEntries.map(entry => entry.entryNo);

      const entriesToDelete = localEntryNos.filter(no => !dynamicsEntryNos.includes(no));

      if (entriesToDelete.length > 0) {
        await this.customerLedgerEntryRepository.delete(entriesToDelete);
        this.logger.debug(`Deleted ${entriesToDelete.length} customer ledger entries not present in Dynamics`);
      }
    }

    await this.updateLastSyncTimestamp(entityName);
  } catch (error) {
    const err = error as any;
    this.logger.error('Error during customer ledger entry synchronization', err.stack);
    throw error;
  }
}

  private transformTmcCustomerLedgerEntry(data: any): CustomerLedgerEntry {
    return this.customerLedgerEntryRepository.create({
      entryNo: data.entryNo,
      postingDate: new Date(data.postingDate),
      documentDate: data.documentDate ? new Date(data.documentDate) : null,
      documentType: data.documentType || null,
      documentNo: data.documentNo || null,
      description: data.description || null,
      customerName: data.customerName || null,
      customerNo: data.customerNo || null,
      amount: data.amount,
      amountLCY: data.amountLCY,
      debitAmount: data.debitAmount,
      creditAmount: data.creditAmount,
      remainingAmount: data.remainingAmount,
      remainingAmtLCY: data.remainingAmtLCY,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      lastModified: new Date(data.lastModifiedDateTime),
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
  // Synchronization Accounts
  // ----------------------------------
  async syncAccounts(fullSync: boolean = false) {
    this.logger.debug(`Synchronizing accounts (fullSync=${fullSync})...`);
    const entityName = 'accounts';
    try {
      const lastSync = fullSync ? null : await this.getLastSyncTimestamp(entityName);
  
      const accounts = await this.v2ApiService.getAccounts(lastSync);
      this.logger.debug(`Fetched ${accounts.length} accounts from V2 API`);
  
      for (const accountData of accounts) {
        const accountEntity = this.transformV2Account(accountData);
        await this.accountRepository.save(accountEntity);
      }
  
      // Optional: Handle deletions during full sync
      if (fullSync) {
        const dynamicsIds = accounts.map(account => account.id);
        const localAccounts = await this.accountRepository.find({ select: ['id'] });
        const localIds = localAccounts.map(account => account.id);
  
        const idsToDelete = localIds.filter(id => !dynamicsIds.includes(id));
  
        if (idsToDelete.length > 0) {
          await this.accountRepository.delete(idsToDelete);
          this.logger.debug(`Deleted ${idsToDelete.length} accounts not present in Dynamics`);
        }
      }
  
      await this.updateLastSyncTimestamp(entityName);
    } catch (error) {
    const err = error as any;
      this.logger.error('Error during accounts synchronization', err.stack);
      throw error;
    }
  }
  
  // Transformation method
  private transformV2Account(data: any): Account {
    return this.accountRepository.create({
      id: data.id,
      number: data.number,
      displayName: data.displayName,
      category: data.category,
      subCategory: data.subCategory || null,
      blocked: data.blocked,
      accountType: data.accountType,
      directPosting: data.directPosting,
      netChange: data.netChange,
      consolidationTranslationMethod: data.consolidationTranslationMethod || null,
      consolidationDebitAccount: data.consolidationDebitAccount || null,
      consolidationCreditAccount: data.consolidationCreditAccount || null,
      excludeFromConsolidation: data.excludeFromConsolidation,
      lastModified: new Date(data.lastModifiedDateTime),
      apiSource: 'v2.0',
    });
  }

   // ----------------------------------
  // Synchronization Bank Accounts
  // ----------------------------------
  async syncBankAccounts(fullSync: boolean = false) {
    this.logger.debug(`Synchronizing bank accounts (fullSync=${fullSync})...`);
    const entityName = 'bank_accounts';
    try {
      const lastSync = fullSync ? null : await this.getLastSyncTimestamp(entityName);
  
      const bankAccounts = await this.v2ApiService.getBankAccounts(lastSync);
      this.logger.debug(`Fetched ${bankAccounts.length} bank accounts from V2 API`);
  
      for (const bankAccountData of bankAccounts) {
        const bankAccountEntity = this.transformV2BankAccount(bankAccountData);
        await this.bankAccountRepository.save(bankAccountEntity);
      }
  
      // Optional: Handle deletions during full sync
      if (fullSync) {
        const dynamicsIds = bankAccounts.map(account => account.id);
        const localAccounts = await this.bankAccountRepository.find({ select: ['id'] });
        const localIds = localAccounts.map(account => account.id);
  
        const idsToDelete = localIds.filter(id => !dynamicsIds.includes(id));
  
        if (idsToDelete.length > 0) {
          await this.bankAccountRepository.delete(idsToDelete);
          this.logger.debug(`Deleted ${idsToDelete.length} bank accounts not present in Dynamics`);
        }
      }
  
      await this.updateLastSyncTimestamp(entityName);
    } catch (error) {
    const err = error as any;
      this.logger.error('Error during bank accounts synchronization', err.stack);
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
      blocked: data.blocked,
      currencyCode: data.currencyCode || null,
      currencyId: data.currencyId !== '00000000-0000-0000-0000-000000000000' ? data.currencyId : null,
      iban: data.iban || null,
      intercompanyEnabled: data.intercompanyEnabled,
      lastModified: new Date(data.lastModifiedDateTime),
      apiSource: 'v2.0',
    });
  }


// ----------------------------------
// Ship-to Address Synchronization
// ----------------------------------
async syncShipToAddresses(fullSync: boolean = false) {
  this.logger.debug(`Synchronizing ship-to addresses (fullSync=${fullSync})...`);
  const entityName = 'ship_to_addresses';
  try {
    const lastSync = fullSync ? null : await this.getLastSyncTimestamp(entityName);

    const shipToAddresses = await this.tmcApiService.getShipToAddresses(lastSync);
    this.logger.debug(`Fetched ${shipToAddresses.length} ship-to addresses from TMC API`);

    for (const data of shipToAddresses) {
      const shipToEntity = this.transformShipToAddress(data);
      await this.shipToAddressRepository.save(shipToEntity);
    }

    // Optional: Handle deletions during full sync
    if (fullSync) {
      const dynamicsIds = shipToAddresses.map(addr => addr.systemId);
      const localAddresses = await this.shipToAddressRepository.find({ select: ['systemId'] });
      const localIds = localAddresses.map(addr => addr.systemId);

      const idsToDelete = localIds.filter(id => !dynamicsIds.includes(id));

      if (idsToDelete.length > 0) {
        await this.shipToAddressRepository.delete(idsToDelete);
        this.logger.debug(`Deleted ${idsToDelete.length} ship-to addresses not present in Dynamics`);
      }
    }

    await this.updateLastSyncTimestamp(entityName);
  } catch (error) {
    const err = error as any;
    this.logger.error('Error during ship-to address synchronization', err.stack);
    throw error;
  }
}

private transformShipToAddress(data: any): ShipToAddress {
  return this.shipToAddressRepository.create({
    systemId: data.systemId,
    customerNo: data.customerNo,
    code: data.code,
    name: data.name,
    name2: data.name2 || null,
    address: data.address || null,
    address2: data.address2 || null,
    postCode: data.postCode || null,
    city: data.city || null,
    state: data.state || null,
    countryRegionCode: data.countryRegionCode || null,
    email: data.eMail || null,
    phoneNo: data.phoneNo || null,
    faxNo: data.faxNo || null,
    contact: data.contact || null,
    gln: data.gln || null,
    cissdmCrossReferenceCode: data.cissdmCrossReferenceCode || null,
    cissdmCustomerCostCenterCode: data.cissdmCustomerCostCenterCode || null,
    systemCreatedAt: new Date(data.SystemCreatedAt),
    lastModifiedDateTime: new Date(data.lastModifiedDateTime),
    apiSource: 'tmc',
  });
}

// ----------------------------------
// Job Synchronization
// ----------------------------------
async syncJobs(fullSync: boolean = false) {
  this.logger.debug(`Synchronizing jobs (fullSync=${fullSync})...`);
  const entityName = 'jobs';
  try {
    const lastSync = fullSync ? null : await this.getLastSyncTimestamp(entityName);

    const jobs = await this.tmcApiService.getJobs(lastSync);
    this.logger.debug(`Fetched ${jobs.length} jobs from TMC API`);

    for (const data of jobs) {
      const jobEntity = this.transformJob(data);
      await this.jobRepository.save(jobEntity);
    }

    // Optional: Handle deletions during full sync
    if (fullSync) {
      const dynamicsIds = jobs.map(job => job.systemId);
      const localJobs = await this.jobRepository.find({ select: ['systemId'] });
      const localIds = localJobs.map(job => job.systemId);

      const idsToDelete = localIds.filter(id => !dynamicsIds.includes(id));

      if (idsToDelete.length > 0) {
        await this.jobRepository.delete(idsToDelete);
        this.logger.debug(`Deleted ${idsToDelete.length} jobs not present in Dynamics`);
      }
    }

    await this.updateLastSyncTimestamp(entityName);
  } catch (error) {
    const err = error as any;
    this.logger.error('Error during job synchronization', err.stack);
    throw error;
  }
}

private transformJob(data: any): Job {
  return this.jobRepository.create({
    systemId: data.systemId,
    no: data.no,
    description: data.description,
    billToCustomerNo: data.billToCustomerNo,
    status: data.status,
    personResponsible: data.personResponsible || null,
    nextInvoiceDate:
      data.nextInvoiceDate && data.nextInvoiceDate !== '0001-01-01'
        ? new Date(data.nextInvoiceDate)
        : null,
    jobPostingGroup: data.jobPostingGroup,
    searchDescription: data.searchDescription || null,
    systemCreatedAt: new Date(data.SystemCreatedAt),
    lastModifiedDateTime: new Date(data.lastModifiedDateTime),
    apiSource: 'tmc',
  });
}

// ----------------------------------
// Billing Schedule Line Synchronization
// ----------------------------------
async syncBillingScheduleLines(fullSync: boolean = false) {
  this.logger.debug(`Synchronizing billing schedule lines (fullSync=${fullSync})...`);
  try {
    const billingScheduleLines = await this.tmcApiService.getBillingScheduleLines();
    this.logger.debug(`Fetched ${billingScheduleLines.length} billing schedule lines from TMC API`);

    // Optional: Clear existing data to avoid duplicates or outdated records
    await this.billingScheduleLineRepository.clear();
    this.logger.debug('Cleared existing billing schedule lines from database');

    // Save fetched billing schedule lines
    for (const data of billingScheduleLines) {
      const billingLineEntity = this.transformBillingScheduleLine(data);
      await this.billingScheduleLineRepository.save(billingLineEntity);
    }

    // Since we're always fetching all records and clearing data, further deletion handling is not necessary
    // No need to update last sync timestamp since we're not using it for this entity
  } catch (error) {
    const err = error as any;
    this.logger.error('Error during billing schedule line synchronization', err.stack);
    throw error;
  }
}

private transformBillingScheduleLine(data: any): BillingScheduleLine {
  return this.billingScheduleLineRepository.create({
    billingScheduleNumber: data.BssiArcbBillingScheduleNumber,
    lineNo: data.LineNo,
    type: data.Type_,
    itemNo: data.ItemNo || null,
    description: data.Description,
    billingType: data.BillingType,
    // Map other fields as needed
    shipToCode: data.ShiptoCode || null,
    apiSource: 'tmc',
  });
}

}


