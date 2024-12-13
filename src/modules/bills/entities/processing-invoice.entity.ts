// src/modules/bills/entities/processing-invoice.entity.ts

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProcessingInvoiceLineItem } from './processing-invoice-line-item.entity';
import { TemAccount } from './tem-account.entity';
// Import the new entity
import { ProcessingInvoiceTable } from './processing-invoice-table.entity';

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

  // Fields for bill type determination
  @Column({ type: 'varchar', length: 50, nullable: true })
  bill_type: string; // 'SLB' or 'MLB'

  @Column({ type: 'boolean', default: false })
  audit_flag: boolean;

  // Fields for validation results
  @Column({ type: 'varchar', length: 50, nullable: true })
  validation_status: string; // 'Pass' or 'Fail'

  @Column({ type: 'int', nullable: true })
  validation_level: number; // 1 or 2

  @Column({ type: 'json', nullable: true })
  validation_errors: any;

  @Column({ nullable: true })
  status: string; // e.g., 'Processed', 'Error', 'Audit', 'MLB Pending'

  @Column({ nullable: true })
  error_message: string;

  @Column({ nullable: true })
  archived_file_path: string;

  // Timestamps
  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @OneToMany(() => ProcessingInvoiceLineItem, (lineItem) => lineItem.invoice, {
    cascade: true,
  })
  line_items: ProcessingInvoiceLineItem[];

  @ManyToOne(() => TemAccount)
  @JoinColumn({ name: 'account_id' })
  account: TemAccount;

  @Column({ nullable: true })
  account_id: number;

  // New relationship to tables
  @OneToMany(() => ProcessingInvoiceTable, (table) => table.invoice, {
    cascade: true,
  })
  tables: ProcessingInvoiceTable[];
}
