import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerLedgerEntry } from '../sync/entities/customer-ledger-entry.entity';
import { SalesInvoice } from '../sync/entities/sales-invoice.entity';
import { DsoController } from './dso.controller';
import { DsoService } from './dso.service';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerLedgerEntry, SalesInvoice])],
  providers: [DsoService],
  controllers: [DsoController],
})
export class DsoModule {}
