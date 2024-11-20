// src/modules/bills/entities/processing-invoice-line-item.entity.ts

import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ProcessingInvoice } from './processing-invoice.entity';

@Entity('processing_invoice_line_items')
export class ProcessingInvoiceLineItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ProcessingInvoice, (invoice) => invoice.line_items, {
    onDelete: 'CASCADE',
  })
  invoice: ProcessingInvoice;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  amount: number;

  @Column({ type: 'date', nullable: true })
  date: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  unit_price: number;

  @Column({ nullable: true })
  product_code: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  tax: number;

  @Column({ nullable: true })
  tax_rate: string;

  @Column({ nullable: true })
  unit: string;

  @Column({ type: 'json', nullable: true })
  other_fields: any;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
