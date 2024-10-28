// src/modules/sync/entities/sales-invoice.entity.ts

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from './customer.entity';
import { SalesInvoiceLine } from './sales-invoice-line.entity';
// Import related entities if they are defined
// import { Currency } from './currency.entity';
// import { PaymentTerm } from './payment-term.entity';
// import { ShipmentMethod } from './shipment-method.entity';
// import { SalesOrder } from './sales-order.entity';

@Entity('sales_invoice')
@Index(['number', 'apiSource'], { unique: true })
export class SalesInvoice {
  /** Primary Key: Invoice ID from the API */
  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  /** Invoice Number */
  @Column({ name: 'number', type: 'varchar', length: 20 })
  number: string;

  /** External Document Number */
  @Column({ name: 'external_document_number', type: 'varchar', length: 35, nullable: true })
  externalDocumentNumber?: string;

  /** Invoice Date */
  @Column({ name: 'invoice_date', type: 'date', nullable: true })
  invoiceDate?: Date;

  /** Posting Date */
  @Column({ name: 'posting_date', type: 'date', nullable: true })
  postingDate?: Date;

  /** Due Date */
  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate?: Date;

  /** Promised Pay Date */
  @Column({ name: 'promised_pay_date', type: 'date', nullable: true })
  promisedPayDate?: Date;

  /** Customer Purchase Order Reference */
  @Column({ name: 'customer_purchase_order_reference', type: 'varchar', length: 35, nullable: true })
  customerPurchaseOrderReference?: string;

  /** Customer */
  @Column({ name: 'customer_id', type: 'char', length: 36, nullable: true })
  customerId?: string;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @Column({ name: 'customer_number', type: 'varchar', length: 20 })
  customerNumber: string;

  @Column({ name: 'customer_name', type: 'varchar', length: 100, nullable: true })
  customerName?: string;

  /** Bill-To Information */
  @Column({ name: 'bill_to_name', type: 'varchar', length: 100, nullable: true })
  billToName?: string;

  @Column({ name: 'bill_to_customer_id', type: 'char', length: 36, nullable: true })
  billToCustomerId?: string;

  @Column({ name: 'bill_to_customer_number', type: 'varchar', length: 20 })
  billToCustomerNumber: string;

  /** Ship-To Information */
  @Column({ name: 'ship_to_name', type: 'varchar', length: 100, nullable: true })
  shipToName?: string;

  @Column({ name: 'ship_to_contact', type: 'varchar', length: 100, nullable: true })
  shipToContact?: string;

  /** Sell-To Address */
  @Column({ name: 'sell_to_address_line1', type: 'varchar', length: 100, nullable: true })
  sellToAddressLine1?: string;

  @Column({ name: 'sell_to_address_line2', type: 'varchar', length: 50, nullable: true })
  sellToAddressLine2?: string;

  @Column({ name: 'sell_to_city', type: 'varchar', length: 30, nullable: true })
  sellToCity?: string;

  @Column({ name: 'sell_to_state', type: 'varchar', length: 30, nullable: true })
  sellToState?: string;

  @Column({ name: 'sell_to_post_code', type: 'varchar', length: 20, nullable: true })
  sellToPostCode?: string;

  @Column({ name: 'sell_to_country', type: 'varchar', length: 10, nullable: true })
  sellToCountry?: string;

  /** Bill-To Address */
  @Column({ name: 'bill_to_address_line1', type: 'varchar', length: 100, nullable: true })
  billToAddressLine1?: string;

  @Column({ name: 'bill_to_address_line2', type: 'varchar', length: 50, nullable: true })
  billToAddressLine2?: string;

  @Column({ name: 'bill_to_city', type: 'varchar', length: 30, nullable: true })
  billToCity?: string;

  @Column({ name: 'bill_to_state', type: 'varchar', length: 30, nullable: true })
  billToState?: string;

  @Column({ name: 'bill_to_post_code', type: 'varchar', length: 20, nullable: true })
  billToPostCode?: string;

  @Column({ name: 'bill_to_country', type: 'varchar', length: 10, nullable: true })
  billToCountry?: string;

  /** Ship-To Address */
  @Column({ name: 'ship_to_address_line1', type: 'varchar', length: 100, nullable: true })
  shipToAddressLine1?: string;

  @Column({ name: 'ship_to_address_line2', type: 'varchar', length: 50, nullable: true })
  shipToAddressLine2?: string;

  @Column({ name: 'ship_to_city', type: 'varchar', length: 30, nullable: true })
  shipToCity?: string;

  @Column({ name: 'ship_to_state', type: 'varchar', length: 30, nullable: true })
  shipToState?: string;

  @Column({ name: 'ship_to_post_code', type: 'varchar', length: 20, nullable: true })
  shipToPostCode?: string;

  @Column({ name: 'ship_to_country', type: 'varchar', length: 10, nullable: true })
  shipToCountry?: string;

  /** Currency */
  @Column({ name: 'currency_id', type: 'char', length: 36, nullable: true })
  currencyId?: string;

  @Column({ name: 'shortcut_dimension1_code', type: 'varchar', length: 20, nullable: true })
  shortcutDimension1Code?: string;

  @Column({ name: 'shortcut_dimension2_code', type: 'varchar', length: 20, nullable: true })
  shortcutDimension2Code?: string;

  @Column({ name: 'currency_code', type: 'varchar', length: 10, nullable: true })
  currencyCode?: string;

  /** Order Reference */
  @Column({ name: 'order_id', type: 'char', length: 36, nullable: true })
  orderId?: string;

  @Column({ name: 'order_number', type: 'varchar', length: 20, nullable: true })
  orderNumber?: string;

  /** Payment Terms */
  @Column({ name: 'payment_terms_id', type: 'char', length: 36, nullable: true })
  paymentTermsId?: string;

  /** Shipment Method */
  @Column({ name: 'shipment_method_id', type: 'char', length: 36, nullable: true })
  shipmentMethodId?: string;

  /** Salesperson */
  @Column({ name: 'salesperson', type: 'varchar', length: 20, nullable: true })
  salesperson?: string;

  /** Dispute Status */
  @Column({ name: 'dispute_status_id', type: 'char', length: 36, nullable: true })
  disputeStatusId?: string;

  @Column({ name: 'dispute_status', type: 'varchar', length: 10, nullable: true })
  disputeStatus?: string;

  /** Prices Include Tax */
  @Column({ name: 'prices_include_tax', type: 'boolean', nullable: true })
  pricesIncludeTax?: boolean;

  /** Remaining Amount */
  @Column({
    name: 'remaining_amount',
    type: 'decimal',
    precision: 28,
    scale: 10,
    nullable: true,
  })
  remainingAmount?: number;

  /** Discount Amount */
  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 28,
    scale: 10,
    nullable: true,
  })
  discountAmount?: number;

  /** Discount Applied Before Tax */
  @Column({ name: 'discount_applied_before_tax', type: 'boolean', nullable: true })
  discountAppliedBeforeTax?: boolean;

  /** Total Amount Excluding Tax */
  @Column({
    name: 'total_amount_excluding_tax',
    type: 'decimal',
    precision: 28,
    scale: 10,
    nullable: true,
  })
  totalAmountExcludingTax?: number;

  /** Total Tax Amount */
  @Column({
    name: 'total_tax_amount',
    type: 'decimal',
    precision: 28,
    scale: 10,
    nullable: true,
  })
  totalTaxAmount?: number;

  /** Total Amount Including Tax */
  @Column({
    name: 'total_amount_including_tax',
    type: 'decimal',
    precision: 28,
    scale: 10,
    nullable: true,
  })
  totalAmountIncludingTax?: number;

  /** Status */
  @Column({ name: 'status', type: 'varchar', length: 50, nullable: true })
  status?: string;

  /** Last Modified */
  @Column({ name: 'last_modified_date_time', type: 'datetime', nullable: true })
  lastModifiedDateTime?: Date;

  /** Phone Number */
  @Column({ name: 'phone_number', type: 'varchar', length: 30, nullable: true })
  phoneNumber?: string;

  /** Email */
  @Column({ name: 'email', type: 'varchar', length: 80, nullable: true })
  email?: string;

  /** API Source */
  @Column({ name: 'api_source', type: 'varchar', length: 10, nullable: true })
  apiSource?: string;

  /** One-to-Many relationship with SalesInvoiceLine */
  @OneToMany(() => SalesInvoiceLine, (line) => line.salesInvoice)
  salesInvoiceLines: SalesInvoiceLine[];

  /** Timestamps */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}