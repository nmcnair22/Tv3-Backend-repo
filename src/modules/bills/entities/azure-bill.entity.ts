// src/modules/bills/entities/azure-bill.entity.ts

import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AzureInvoiceItem } from './azure-invoice-item.entity';

@Entity('azure_bills')
export class AzureBill {
  @PrimaryGeneratedColumn()
  id: number;

  // Define other columns
  @Column({ nullable: true })
  vendorName: string;

  // ... other columns

  @OneToMany(() => AzureInvoiceItem, (invoiceItem) => invoiceItem.azureBill)
  invoiceItems: AzureInvoiceItem[];
}
