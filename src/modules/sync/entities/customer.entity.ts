// src/modules/sync/entities/customer.entity.ts

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentHistory } from '../../sync/entities/payment-history.entity';
import { CreditScoreHistory } from './credit-score-history.entity';
import { SalesInvoice } from './sales-invoice.entity';

@Entity('customer')
@Index(['customerNumber', 'apiSource'], { unique: true })
export class Customer {
  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'customerNumber', type: 'varchar', length: 50, unique: true })
  customerNumber: string;

  @Column({ name: 'display_name', type: 'varchar', length: 100 })
  displayName: string;

  @Column({ name: 'type', type: 'varchar', length: 20, nullable: true })
  type?: string;

  @Column({ name: 'address_line1', type: 'varchar', length: 100, nullable: true })
  addressLine1?: string;

  @Column({ name: 'address_line2', type: 'varchar', length: 50, nullable: true })
  addressLine2?: string;

  @Column({ name: 'city', type: 'varchar', length: 30, nullable: true })
  city?: string;

  @Column({ name: 'state', type: 'varchar', length: 30, nullable: true })
  state?: string;

  @Column({ name: 'postal_code', type: 'varchar', length: 20, nullable: true })
  postalCode?: string;

  @Column({ name: 'country', type: 'varchar', length: 10, nullable: true })
  country?: string;

  @Column({ name: 'phone_number', type: 'varchar', length: 30, nullable: true })
  phoneNumber?: string;

  @Column({ name: 'email', type: 'varchar', length: 80, nullable: true })
  email?: string;

  @Column({ name: 'website', type: 'varchar', length: 80, nullable: true })
  website?: string;

  @Column({ name: 'salesperson_code', type: 'varchar', length: 20, nullable: true })
  salespersonCode?: string;

  @Column({
    name: 'balance_due',
    type: 'decimal',
    precision: 28,
    scale: 10,
    nullable: true,
  })
  balanceDue?: number;

  @Column({
    name: 'credit_limit',
    type: 'decimal',
    precision: 28,
    scale: 10,
    nullable: true,
  })
  creditLimit?: number;

  @Column({ name: 'tax_liable', type: 'boolean', nullable: true })
  taxLiable?: boolean;

  @Column({ name: 'tax_area_id', type: 'char', length: 36, nullable: true })
  taxAreaId?: string;

  @Column({ name: 'tax_area_display_name', type: 'varchar', length: 100, nullable: true })
  taxAreaDisplayName?: string;

  @Column({
    name: 'tax_registration_number',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  taxRegistrationNumber?: string;

  @Column({ name: 'currency_id', type: 'char', length: 36, nullable: true })
  currencyId?: string;

  @Column({ name: 'currency_code', type: 'varchar', length: 10, nullable: true })
  currencyCode?: string;

  @Column({ name: 'payment_terms_id', type: 'char', length: 36, nullable: true })
  paymentTermsId?: string;

  @Column({ name: 'shipment_method_id', type: 'char', length: 36, nullable: true })
  shipmentMethodId?: string;

  @Column({ name: 'payment_method_id', type: 'char', length: 36, nullable: true })
  paymentMethodId?: string;

  @Column({ name: 'blocked', type: 'varchar', length: 20, nullable: true })
  blocked?: string;

  @Column({ name: 'last_modified_date_time', type: 'datetime', nullable: true })
  lastModifiedDateTime?: Date;

  @Column({ name: 'api_source', type: 'varchar', length: 10 })
  apiSource: string;

  /** 
   * New Fields for Credit Scoring
   */

  /** Current Credit Score */
  @Column({ name: 'credit_score', type: 'int', nullable: true, default: null })
  creditScore?: number;

  /** Current Credit Tier */
  @Column({ name: 'credit_tier', type: 'varchar', length: 20, nullable: true, default: null })
  creditTier?: string;

  /** Total Spend */
  @Column({ name: 'total_spend', type: 'decimal', precision: 15, scale: 2, nullable: false, default: 0 })
  totalSpend: number;

  /** Average Monthly Spend */
  @Column({ name: 'average_monthly_spend', type: 'decimal', precision: 15, scale: 2, nullable: false, default: 0 })
  averageMonthlySpend: number;

  /** On-Time Payments */
  @Column({ name: 'on_time_payments', type: 'int', nullable: false, default: 0 })
  onTimePayments: number;

  /** Early Payments */
  @Column({ name: 'early_payments', type: 'int', nullable: false, default: 0 })
  earlyPayments: number;

  /** Late Payments */
  @Column({ name: 'late_payments', type: 'int', nullable: false, default: 0 })
  latePayments: number;

  /** Late Payments 1-30 Days */
  @Column({ name: 'late_payments_1_30', type: 'int', nullable: false, default: 0 })
  latePayments1_30: number;

  /** Late Payments 31-60 Days */
  @Column({ name: 'late_payments_31_60', type: 'int', nullable: false, default: 0 })
  latePayments31_60: number;

  /** Late Payments 61-90 Days */
  @Column({ name: 'late_payments_61_90', type: 'int', nullable: false, default: 0 })
  latePayments61_90: number;

  /** Late Payments 90+ Days */
  @Column({ name: 'late_payments_90_plus', type: 'int', nullable: false, default: 0 })
  latePayments90Plus: number;

  /** Outstanding Balance */
  @Column({ name: 'outstanding_balance', type: 'decimal', precision: 15, scale: 2, nullable: false, default: 0 })
  outstandingBalance: number;

  /** Balance to Spend Ratio */
  @Column({ name: 'balance_to_spend_ratio', type: 'decimal', precision: 5, scale: 2, nullable: false, default: 0 })
  balanceToSpendRatio: number;

  /**
   * One-to-Many relationship with CreditScoreHistory
   */
  @OneToMany(() => CreditScoreHistory, (history: CreditScoreHistory) => history.customer)
  creditScoreHistories: CreditScoreHistory[];

  /** One-to-Many relationship with SalesInvoice */
  @OneToMany(() => SalesInvoice, (salesInvoice: SalesInvoice) => salesInvoice.customer)
  salesInvoices: SalesInvoice[];

  /** One-to-Many relationship with PaymentHistory */
  @OneToMany(() => PaymentHistory, (payment: PaymentHistory) => payment.customer)
  paymentHistories: PaymentHistory[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
