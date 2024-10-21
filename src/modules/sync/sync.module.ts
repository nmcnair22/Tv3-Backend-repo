// src/modules/sync/sync.module.ts

import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Import all entities
import { CustomerLedgerEntry } from './entities/customer-ledger-entry.entity';
import { Customer } from './entities/customer.entity';
import { GeneralLedgerEntry } from './entities/general-ledger-entry.entity';
import { Item } from './entities/item.entity';
import { PurchaseCreditMemoLine } from './entities/purchase-credit-memo-line.entity';
import { PurchaseCreditMemo } from './entities/purchase-credit-memo.entity';
import { PurchaseInvoiceLine } from './entities/purchase-invoice-line.entity'; // Added
import { PurchaseInvoice } from './entities/purchase-invoice.entity';
import { PurchaseOrderLine } from './entities/purchase-order-line.entity'; // Added
import { PurchaseOrder } from './entities/purchase-order.entity';
import { SalesCreditMemoLine } from './entities/sales-credit-memo-line.entity';
import { SalesCreditMemo } from './entities/sales-credit-memo.entity';
import { SalesInvoiceLine } from './entities/sales-invoice-line.entity';
import { SalesInvoice } from './entities/sales-invoice.entity';
import { SyncStatus } from './entities/sync-status.entity';
import { Vendor } from './entities/vendor.entity';

// Import services
import { SyncService } from './sync.service';
import { TmcApiService } from './tmc-api/tmc-api.service';
import { V2ApiService } from './v2-api/v2-api.service';

// Import DynamicsModule if needed
import { DynamicsModule } from '../dynamics/dynamics.module';

// Import SyncController if implemented
// If you have a controller for synchronization, import it here.
import { SyncController } from '../sync/sync.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SyncStatus,
      Customer,
      Vendor,
      Item,
      SalesInvoice,
      SalesInvoiceLine,
      SalesCreditMemo,
      SalesCreditMemoLine,
      PurchaseInvoice,
      PurchaseInvoiceLine,
      PurchaseOrder,
      PurchaseOrderLine,
      PurchaseCreditMemo,
      PurchaseCreditMemoLine,
      GeneralLedgerEntry,
      CustomerLedgerEntry,
    ]),
    HttpModule,
    DynamicsModule, 
  ],
  providers: [SyncService, V2ApiService, TmcApiService],
  controllers: [SyncController],
  exports: [SyncService],
})
export class SyncModule {}