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
// Import PaymentTerms, ShipmentMethod, PurchaseOrderLine entities if defined
// import { PaymentTerms } from './payment-terms.entity';
// import { ShipmentMethod } from './shipment-method.entity';
// import { PurchaseOrderLine } from './purchase-order-line.entity';

@Entity('purchase_order')
@Index(['number', 'apiSource'], { unique: true })
export class PurchaseOrder {
  /** Primary Key: Order ID from the API */
  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  /** Order Number */
  @Column({ name: 'number', type: 'varchar', length: 50 })
  number: string;

  /** Order Date */
  @Column({ name: 'order_date', type: 'date' })
  orderDate: Date;

  /** Posting Date */
  @Column({ name: 'posting_date', type: 'date' })
  postingDate: Date;

  /** Vendor */
  @Column({ name: 'vendor_id', type: 'char', length: 36 })
  vendorId: string;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @Column({ name: 'vendor_number', type: 'varchar', length: 20 })
  vendorNumber: string;

  @Column({ name: 'vendor_name', type: 'varchar', length: 100 })
  vendorName: string;

  /** Pay-To Information */
  @Column({ name: 'pay_to_name', type: 'varchar', length: 100, nullable: true })
  payToName?: string;

  @Column({ name: 'pay_to_vendor_id', type: 'char', length: 36, nullable: true })
  payToVendorId?: string;

  @Column({ name: 'pay_to_vendor_number', type: 'varchar', length: 20, nullable: true })
  payToVendorNumber?: string;

  /** Ship-To Information */
  @Column({ name: 'ship_to_name', type: 'varchar', length: 100, nullable: true })
  shipToName?: string;

  @Column({ name: 'ship_to_contact', type: 'varchar', length: 100, nullable: true })
  shipToContact?: string;

  /** Buy-From Address */
  @Column({ name: 'buy_from_address_line1', type: 'varchar', length: 100, nullable: true })
  buyFromAddressLine1?: string;

  @Column({ name: 'buy_from_address_line2', type: 'varchar', length: 100, nullable: true })
  buyFromAddressLine2?: string;

  @Column({ name: 'buy_from_city', type: 'varchar', length: 50, nullable: true })
  buyFromCity?: string;

  @Column({ name: 'buy_from_state', type: 'varchar', length: 50, nullable: true })
  buyFromState?: string;

  @Column({ name: 'buy_from_post_code', type: 'varchar', length: 20, nullable: true })
  buyFromPostCode?: string;

  @Column({ name: 'buy_from_country', type: 'varchar', length: 50, nullable: true })
  buyFromCountry?: string;

  /** Pay-To Address */
  @Column({ name: 'pay_to_address_line1', type: 'varchar', length: 100, nullable: true })
  payToAddressLine1?: string;

  @Column({ name: 'pay_to_address_line2', type: 'varchar', length: 100, nullable: true })
  payToAddressLine2?: string;

  @Column({ name: 'pay_to_city', type: 'varchar', length: 50, nullable: true })
  payToCity?: string;

  @Column({ name: 'pay_to_state', type: 'varchar', length: 50, nullable: true })
  payToState?: string;

  @Column({ name: 'pay_to_post_code', type: 'varchar', length: 20, nullable: true })
  payToPostCode?: string;

  @Column({ name: 'pay_to_country', type: 'varchar', length: 50, nullable: true })
  payToCountry?: string;

  /** Ship-To Address */
  @Column({ name: 'ship_to_address_line1', type: 'varchar', length: 100, nullable: true })
  shipToAddressLine1?: string;

  @Column({ name: 'ship_to_address_line2', type: 'varchar', length: 100, nullable: true })
  shipToAddressLine2?: string;

  @Column({ name: 'ship_to_city', type: 'varchar', length: 50, nullable: true })
  shipToCity?: string;

  @Column({ name: 'ship_to_state', type: 'varchar', length: 50, nullable: true })
  shipToState?: string;

  @Column({ name: 'ship_to_post_code', type: 'varchar', length: 20, nullable: true })
  shipToPostCode?: string;

  @Column({ name: 'ship_to_country', type: 'varchar', length: 50, nullable: true })
  shipToCountry?: string;

  /** Shortcut Dimensions */
  @Column({ name: 'shortcut_dimension1_code', type: 'varchar', length: 50, nullable: true })
  shortcutDimension1Code?: string;

  @Column({ name: 'shortcut_dimension2_code', type: 'varchar', length: 50, nullable: true })
  shortcutDimension2Code?: string;


  @Column({ name: 'currency_code', type: 'varchar', length: 10, nullable: true })
  currencyCode?: string;

  /** Prices Include Tax */
  @Column({ name: 'prices_include_tax', type: 'boolean' })
  pricesIncludeTax: boolean;

  /** Payment Terms */
  @Column({ name: 'payment_terms_id', type: 'char', length: 36, nullable: true })
  paymentTermsId?: string;

  // Uncomment if PaymentTerms entity is defined
  // @ManyToOne(() => PaymentTerms)
  // @JoinColumn({ name: 'payment_terms_id' })
  // paymentTerms?: PaymentTerms;

  /** Shipment Method */
  @Column({ name: 'shipment_method_id', type: 'char', length: 36, nullable: true })
  shipmentMethodId?: string;

  // Uncomment if ShipmentMethod entity is defined
  // @ManyToOne(() => ShipmentMethod)
  // @JoinColumn({ name: 'shipment_method_id' })
  // shipmentMethod?: ShipmentMethod;

  /** Purchaser */
  @Column({ type: 'varchar', length: 100, nullable: true })
  purchaser?: string;

  /** Requested Receipt Date */
  @Column({ name: 'requested_receipt_date', type: 'date', nullable: true })
  requestedReceiptDate?: Date;

  /** Discount Amount */
  @Column({ name: 'discount_amount', type: 'decimal', precision: 18, scale: 2 })
  discountAmount: number;

  /** Discount Applied Before Tax */
  @Column({ name: 'discount_applied_before_tax', type: 'boolean' })
  discountAppliedBeforeTax: boolean;

  /** Total Amount Excluding Tax */
  @Column({ name: 'total_amount_excluding_tax', type: 'decimal', precision: 18, scale: 2 })
  totalAmountExcludingTax: number;

  /** Total Tax Amount */
  @Column({ name: 'total_tax_amount', type: 'decimal', precision: 18, scale: 2 })
  totalTaxAmount: number;

  /** Total Amount Including Tax */
  @Column({ name: 'total_amount_including_tax', type: 'decimal', precision: 18, scale: 2 })
  totalAmountIncludingTax: number;

  /** Fully Received */
  @Column({ name: 'fully_received', type: 'boolean' })
  fullyReceived: boolean;

  /** Status */
  @Column({ type: 'varchar', length: 50 })
  status: string;

  /** Last Modified */
  @Column({ name: 'last_modified', type: 'datetime' })
  lastModified: Date;

  /** API Source */
  @Column({ name: 'api_source', type: 'varchar', length: 10 })
  apiSource: string;

  /** Timestamps */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /** One-to-Many relationship with PurchaseOrderLine */
  @OneToMany(() => PurchaseOrderLine, (line) => line.purchaseOrder)
  purchaseOrderLines: PurchaseOrderLine[];
}