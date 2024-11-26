// src/modules/bills/bills.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillGateway } from './bill.gateway';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';

// Entities from the new database (business_central_db)
import { Location } from './entities/location.entity';
import { ProcessingInvoiceLineItem } from './entities/processing-invoice-line-item.entity';
import { ProcessingInvoice } from './entities/processing-invoice.entity';
import { TemAccount } from './entities/tem-account.entity';
import { TemBillLineItem } from './entities/tem-bill-line-item.entity';
import { TemBill } from './entities/tem-bill.entity';
import { TemCustomer } from './entities/tem-customer.entity';
import { TemVendor } from './entities/tem-vendor.entity';

// Entities from the old 'tem' database
import { TemMasterView } from './entities/tem-master-view.entity';
import { TemVendorOld } from './entities/tem-vendor-old.entity';

// Entities from the old 'cissdm' database
import { CissdmCustomer } from './entities/cissdm-customer.entity';
import { CissdmLocation } from './entities/cissdm-location.entity';
import { CissdmProvider } from './entities/cissdm-provider.entity';

// Services
import { AnalyzeService } from './services/analyze.service';
import { BillTypeService } from './services/bill-type.service';
import { ValidationService } from './services/validate.service';

@Module({
  imports: [
    // Connection to the new database (default connection)
    TypeOrmModule.forFeature([
      TemAccount,
      TemMasterView,
      TemBill,
      TemBillLineItem,
      TemVendor,
      TemCustomer,
      ProcessingInvoice,
      ProcessingInvoiceLineItem,
      Location,
    ]),
    // Connection to the old 'tem' database
    TypeOrmModule.forFeature([TemVendorOld, TemMasterView], 'temConnection'),
    // Connection to the old 'cissdm' database
    TypeOrmModule.forFeature(
      [CissdmCustomer, CissdmLocation, CissdmProvider],
      'cissdmConnection',
    ),
  ],
  providers: [
    BillsService,
    AnalyzeService,
    BillTypeService,
    ValidationService,
    BillGateway,
  ],
  controllers: [BillsController],
  exports: [BillsService],
})
export class BillsModule {}
