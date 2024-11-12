// src/modules/payments/entities/payment-history.entity.ts

import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Customer } from '../../sync/entities/customer.entity';
import { SalesInvoice } from '../../sync/entities/sales-invoice.entity';
  
@Entity('payment_history')
export class PaymentHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'payment_id', unique: true })
  paymentId: string;

  @Column({ name: 'deposit_entry_no' })
  depositEntryNo: string;

  @Column({ name: 'payment_amount', type: 'decimal', precision: 15, scale: 2 })
  paymentAmount: number;

  @Column({ name: 'payment_type' })
  paymentType: string; // e.g., 'Check', 'ACH', etc.

  @Column({ name: 'related_invoice_id', type: 'char', length: 36 })
  relatedInvoiceId: string;

  @Column({ name: 'customer_number' })
  customerNumber: string;

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate: Date;

  @Column({ name: 'status' })
  status: string; // e.g., 'On-Time', 'Late', 'Partial'

  @Column({ name: 'days_early', nullable: true })
  daysEarly?: number;

  @Column({ name: 'days_late', nullable: true })
  daysLate?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relationships

  @ManyToOne(() => Customer, (customer: Customer) => customer.paymentHistories)
  @JoinColumn({ name: 'customer_number', referencedColumnName: 'customerNumber' })
  customer: Customer;

  @ManyToOne(() => SalesInvoice, (invoice: SalesInvoice) => invoice.paymentHistories)
  @JoinColumn({ name: 'related_invoice_id', referencedColumnName: 'id' })
  invoice: SalesInvoice;
  
}
