// src/modules/dynamics/dynamics.module.ts
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DynamicsAccountService } from './dynamics-account.service';
import { DynamicsAuthService } from './dynamics-auth.service';
import { DynamicsBaseService } from './dynamics-base.service';
import { DynamicsCreditService } from './dynamics-credit.service';
import { DynamicsGlEntryService } from './dynamics-glentry.service';
import { DynamicsInvoiceService } from './dynamics-invoice.service';
import { DynamicsItemService } from './dynamics-item.service';
import { DynamicsPaymentService } from './dynamics-payment.service';
import { DynamicsReportsService } from './dynamics-reports.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule, // If services use ConfigService
  ],
  providers: [
    DynamicsAuthService,
    DynamicsBaseService,
    DynamicsCreditService,
    DynamicsReportsService,
    DynamicsInvoiceService,
    DynamicsPaymentService,
    DynamicsItemService,
    DynamicsAccountService,
    DynamicsGlEntryService,
  ],
  exports: [
    DynamicsAuthService,
    DynamicsReportsService,
    DynamicsInvoiceService,
    DynamicsPaymentService,
    DynamicsItemService,
    DynamicsCreditService,
    DynamicsAccountService,
    DynamicsGlEntryService,
  ],
})
export class DynamicsModule {}
