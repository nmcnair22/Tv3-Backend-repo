// src/modules/sync/entities/purchase-order.entity.ts

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

import { PurchaseOrderLine } from './purchase-order-line.entity';
import { Vendor } from './vendor.entity';
// Import Currency, PaymentTerm, ShipmentMethod if they are defined
// import { Currency } from './currency.entity';
// import { PaymentTerm } from './payment-term.entity';
// import { ShipmentMethod } from './shipment-method.entity';

@Entity('purchase_order')
@Index(['number', 'apiSource'], { unique: true })
export class PurchaseOrder {
  /** Primary Key: Order ID from the API */
  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  /** Order Number */
  @Column({ name: 'number', type: 'varchar', length: 20 })
  number: string;

  /** Order Date */
  @Column({ name: 'order_date', type: 'date', nullable: true })
  orderDate?: Date;

  /** Posting Date */
  @Column({ name: 'posting_date', type: 'date', nullable: true })
  postingDate?: Date;

  /** Vendor */
  @Column({ name: 'vendor_id', type: 'char', length: 36, nullable: true })
  vendorId?: string;

  @ManyToOne(() => Vendor, { nullable: true })
  @JoinColumn({ name: 'vendor_id' })
  vendor?: Vendor;

  @Column({ name: 'vendor_number', type: 'varchar', length: 20 })
  vendorNumber: string;

  @Column({ name: 'vendor_name', type: 'varchar', length: 100, nullable: true })
  vendorName?: string;

  /** Pay-To Information */
  @Column({ name: 'pay_to_name', type: 'varchar', length: 100, nullable: true })
  payToName?: string;

  @Column({ name: 'pay_to_vendor_id', type: 'char', length: 36, nullable: true })
  payToVendorId?: string;

  @Column({ name: 'pay_to_vendor_number', type: 'varchar', length: 20 })
  payToVendorNumber: string;

  /** Ship-To Information */
  @Column({ name: 'ship_to_name', type: 'varchar', length: 100, nullable: true })
  shipToName?: string;

  @Column({ name: 'ship_to_contact', type: 'varchar', length: 100, nullable: true })
  shipToContact?: string;

  /** Buy-From Address */
  @Column({ name: 'buy_from_address_line1', type: 'varchar', length: 100, nullable: true })
  buyFromAddressLine1?: string;

  @Column({ name: 'buy_from_address_line2', type: 'varchar', length: 50, nullable: true })
  buyFromAddressLine2?: string;

  @Column({ name: 'buy_from_city', type: 'varchar', length: 30, nullable: true })
  buyFromCity?: string;

  @Column({ name: 'buy_from_country', type: 'varchar', length: 10, nullable: true })
  buyFromCountry?: string;

  @Column({ name: 'buy_from_state', type: 'varchar', length: 30, nullable: true })
  buyFromState?: string;

  @Column({ name: 'buy_from_post_code', type: 'varchar', length: 20, nullable: true })
  buyFromPostCode?: string;

  /** Pay-To Address */
  @Column({ name: 'pay_to_address_line1', type: 'varchar', length: 100, nullable: true })
  payToAddressLine1?: string;

  @Column({ name: 'pay_to_address_line2', type: 'varchar', length: 50, nullable: true })
  payToAddressLine2?: string;

  @Column({ name: 'pay_to_city', type: 'varchar', length: 30, nullable: true })
  payToCity?: string;

  @Column({ name: 'pay_to_country', type: 'varchar', length: 10, nullable: true })
  payToCountry?: string;

  @Column({ name: 'pay_to_state', type: 'varchar', length: 30, nullable: true })
  payToState?: string;

  @Column({ name: 'pay_to_post_code', type: 'varchar', length: 20, nullable: true })
  payToPostCode?: string;

  /** Ship-To Address */
  @Column({ name: 'ship_to_address_line1', type: 'varchar', length: 100, nullable: true })
  shipToAddressLine1?: string;

  @Column({ name: 'ship_to_address_line2', type: 'varchar', length: 50, nullable: true })
  shipToAddressLine2?: string;

  @Column({ name: 'ship_to_city', type: 'varchar', length: 30, nullable: true })
  shipToCity?: string;

  @Column({ name: 'ship_to_country', type: 'varchar', length: 10, nullable: true })
  shipToCountry?: string;

  @Column({ name: 'ship_to_state', type: 'varchar', length: 30, nullable: true })
  shipToState?: string;

  @Column({ name: 'ship_to_post_code', type: 'varchar', length: 20, nullable: true })
  shipToPostCode?: string;

  /** Shortcut Dimensions */
  @Column({ name: 'shortcut_dimension1_code', type: 'varchar', length: 20, nullable: true })
  shortcutDimension1Code?: string;

  @Column({ name: 'shortcut_dimension2_code', type: 'varchar', length: 20, nullable: true })
  shortcutDimension2Code?: string;

  /** Currency */
  @Column({ name: 'currency_id', type: 'char', length: 36, nullable: true })
  currencyId?: string;

  @Column({ name: 'currency_code', type: 'varchar', length: 10, nullable: true })
  currencyCode?: string;

  /** Prices Include Tax */
  @Column({ name: 'prices_include_tax', type: 'boolean', nullable: true })
  pricesIncludeTax?: boolean;

  /** Payment Terms */
  @Column({ name: 'payment_terms_id', type: 'char', length: 36, nullable: true })
  paymentTermsId?: string;

  // Uncomment if PaymentTerm entity is defined
  // @ManyToOne(() => PaymentTerm)
  // @JoinColumn({ name: 'payment_terms_id' })
  // paymentTerm?: PaymentTerm;

  /** Shipment Method */
  @Column({ name: 'shipment_method_id', type: 'char', length: 36, nullable: true })
  shipmentMethodId?: string;

  // Uncomment if ShipmentMethod entity is defined
  // @ManyToOne(() => ShipmentMethod)
  // @JoinColumn({ name: 'shipment_method_id' })
  // shipmentMethod?: ShipmentMethod;

  /** Purchaser */
  @Column({ name: 'purchaser', type: 'varchar', length: 20, nullable: true })
  purchaser?: string;

  /** Requested Receipt Date */
  @Column({ name: 'requested_receipt_date', type: 'date', nullable: true })
  requestedReceiptDate?: Date;

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

  /** Fully Received */
  @Column({ name: 'fully_received', type: 'boolean', nullable: true })
  fullyReceived?: boolean;

  /** Status */
  @Column({ name: 'status', type: 'varchar', length: 50, nullable: true })
  status?: string;

  /** Last Modified */
  @Column({ name: 'last_modified_date_time', type: 'datetime', nullable: true })
  lastModifiedDateTime?: Date;

  /** API Source */
  @Column({ name: 'api_source', type: 'varchar', length: 10, nullable: true })
  apiSource?: string;

  /** One-to-Many relationship with PurchaseOrderLine */
  @OneToMany(() => PurchaseOrderLine, (line) => line.purchaseOrder)
  purchaseOrderLines: PurchaseOrderLine[];

  /** Timestamps */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}