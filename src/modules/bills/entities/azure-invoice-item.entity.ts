// src/modules/bills/entities/azure-invoice-item.entity.ts

import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AzureBill } from './azure-bill.entity';

@Entity('azure_invoice_items')
export class AzureInvoiceItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  azureBillId: string; // Ensure this matches AzureBill's ID type (uuid)

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount: number;

  @Column({ type: 'float', nullable: true })
  confidenceDescription: number;

  @Column({ type: 'float', nullable: true })
  confidenceQuantity: number;

  @Column({ type: 'float', nullable: true })
  confidenceUnitPrice: number;

  @Column({ type: 'float', nullable: true })
  confidenceAmount: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @ManyToOne(() => AzureBill, (azureBill) => azureBill.invoiceItems)
  azureBill: AzureBill;
}
