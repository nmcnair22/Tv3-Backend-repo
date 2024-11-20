// src/modules/bills/entities/processing-invoice.entity.ts

import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ProcessingInvoiceLineItem } from './processing-invoice-line-item.entity';

@Entity('processing_invoices')
export class ProcessingInvoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  invoice_id: string;

  @Column({ type: 'date', nullable: true })
  invoice_date: Date;

  @Column({ type: 'date', nullable: true })
  due_date: Date;

  @Column({ nullable: true })
  vendor_name: string;

  @Column({ type: 'json', nullable: true })
  vendor_address: any;

  @Column({ nullable: true })
  vendor_address_recipient: string;

  @Column({ nullable: true })
  customer_name: string;

  @Column({ nullable: true })
  customer_id: string;

  @Column({ type: 'json', nullable: true })
  customer_address: any;

  @Column({ nullable: true })
  customer_address_recipient: string;

  @Column({ nullable: true })
  purchase_order: string;

  @Column({ nullable: true })
  payment_term: string;

  @Column({ nullable: true })
  vendor_tax_id: string;

  @Column({ nullable: true })
  customer_tax_id: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  subtotal: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  total_tax: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  total_discount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  invoice_total: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  amount_due: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  previous_unpaid_balance: number;

  @Column({ type: 'json', nullable: true })
  remittance_address: any;

  @Column({ nullable: true })
  remittance_address_recipient: string;

  @Column({ type: 'date', nullable: true })
  service_start_date: Date;

  @Column({ type: 'date', nullable: true })
  service_end_date: Date;

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

  @OneToMany(() => ProcessingInvoiceLineItem, (lineItem) => lineItem.invoice, {
    cascade: true,
  })
  line_items: ProcessingInvoiceLineItem[];
}
