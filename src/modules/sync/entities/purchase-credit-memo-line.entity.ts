// src/modules/sync/entities/purchase-credit-memo-line.entity.ts

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PurchaseCreditMemo } from './purchase-credit-memo.entity';

@Entity('purchase_credit_memo_line')
export class PurchaseCreditMemoLine {
  /** Primary Key: Line ID */
  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  /** Foreign Key: Purchase Credit Memo ID */
  @Column({ name: 'document_id', type: 'char', length: 36, nullable: true })
  documentId?: string;

  /** Sequence Number */
  @Column({ name: 'sequence', type: 'int', nullable: true })
  sequence?: number;

  /** Item ID */
  @Column({ name: 'item_id', type: 'char', length: 36, nullable: true })
  itemId?: string;

  /** Account ID */
  @Column({ name: 'account_id', type: 'char', length: 36, nullable: true })
  accountId?: string;

  /** Line Type */
  @Column({ name: 'line_type', type: 'varchar', length: 50, nullable: true })
  lineType?: string;

  /** Line Object Number */
  @Column({
    name: 'line_object_number',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  lineObjectNumber?: string;

  /** Description */
  @Column({ name: 'description', type: 'varchar', length: 100, nullable: true })
  description?: string;

  /** Unit of Measure ID */
  @Column({
    name: 'unit_of_measure_id',
    type: 'char',
    length: 36,
    nullable: true,
  })
  unitOfMeasureId?: string;

  /** Unit of Measure Code */
  @Column({
    name: 'unit_of_measure_code',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  unitOfMeasureCode?: string;

  /** Unit Cost */
  @Column({
    name: 'unit_cost',
    type: 'decimal',
    precision: 28,
    scale: 10,
    nullable: true,
  })
  unitCost?: number;

  /** Quantity */
  @Column({
    name: 'quantity',
    type: 'decimal',
    precision: 28,
    scale: 10,
    nullable: true,
  })
  quantity?: number;

  /** Discount Amount */
  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 28,
    scale: 10,
    nullable: true,
  })
  discountAmount?: number;

  /** Discount Percent */
  @Column({
    name: 'discount_percent',
    type: 'decimal',
    precision: 28,
    scale: 10,
    nullable: true,
  })
  discountPercent?: number;

  /** Discount Applied Before Tax */
  @Column({
    name: 'discount_applied_before_tax',
    type: 'boolean',
    nullable: true,
  })
  discountAppliedBeforeTax?: boolean;

  /** Amount Excluding Tax */
  @Column({
    name: 'amount_excluding_tax',
    type: 'decimal',
    precision: 28,
    scale: 10,
    nullable: true,
  })
  amountExcludingTax?: number;

  /** Tax Code */
  @Column({
    name: 'tax_code',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  taxCode?: string;

  /** Tax Percent */
  @Column({
    name: 'tax_percent',
    type: 'decimal',
    precision: 28,
    scale: 10,
    nullable: true,
  })
  taxPercent?: number;

  /** Total Tax Amount */
  @Column({
    name: 'total_tax_amount',
    type: 'decimal',
    precision: 28,
    scale: 10,
    nullable: true,
  })
  totalTaxAmount?: number;

  /** Amount Including Tax */
  @Column({
    name: 'amount_including_tax',
    type: 'decimal',
    precision: 28,
    scale: 10,
    nullable: true,
  })
  amountIncludingTax?: number;

  /** Invoice Discount Allocation */
  @Column({
    name: 'invoice_discount_allocation',
    type: 'decimal',
    precision: 28,
    scale: 10,
    nullable: true,
  })
  invoiceDiscountAllocation?: number;

  /** Net Amount */
  @Column({
    name: 'net_amount',
    type: 'decimal',
    precision: 28,
    scale: 10,
    nullable: true,
  })
  netAmount?: number;

  /** Net Tax Amount */
  @Column({
    name: 'net_tax_amount',
    type: 'decimal',
    precision: 28,
    scale: 10,
    nullable: true,
  })
  netTaxAmount?: number;

  /** Net Amount Including Tax */
  @Column({
    name: 'net_amount_including_tax',
    type: 'decimal',
    precision: 28,
    scale: 10,
    nullable: true,
  })
  netAmountIncludingTax?: number;

  /** Item Variant ID */
  @Column({
    name: 'item_variant_id',
    type: 'char',
    length: 36,
    nullable: true,
  })
  itemVariantId?: string;

  /** Location ID */
  @Column({
    name: 'location_id',
    type: 'char',
    length: 36,
    nullable: true,
  })
  locationId?: string;

  /** API Source */
  @Column({ name: 'api_source', type: 'varchar', length: 10, nullable: true })
  apiSource?: string;

  /** Many-to-One relationship with PurchaseCreditMemo */
  @ManyToOne(
    () => PurchaseCreditMemo,
    (purchaseCreditMemo) => purchaseCreditMemo.purchaseCreditMemoLines,
    { nullable: true }
  )
  @JoinColumn({ name: 'document_id', referencedColumnName: 'id' })
  purchaseCreditMemo?: PurchaseCreditMemo;

  /** Timestamps */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}