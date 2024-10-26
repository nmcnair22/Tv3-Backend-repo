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
import { SalesInvoice } from './sales-invoice.entity';

@Entity('customer')
@Index(['customerNumber', 'apiSource'], { unique: true })
export class Customer {
  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'customer_number', type: 'varchar', length: 20 })
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

  /** One-to-Many relationship with SalesInvoice */
  @OneToMany(() => SalesInvoice, (salesInvoice) => salesInvoice.customer)
  salesInvoices: SalesInvoice[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}