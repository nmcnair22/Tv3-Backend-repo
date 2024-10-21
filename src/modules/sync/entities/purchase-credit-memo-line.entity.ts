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
  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'purchase_credit_memo_id', type: 'char', length: 36 })
  purchaseCreditMemoId: string;

  @ManyToOne(
    () => PurchaseCreditMemo,
    (purchaseCreditMemo) => purchaseCreditMemo.purchaseCreditMemoLines
  )
  @JoinColumn({ name: 'purchase_credit_memo_id' })
  purchaseCreditMemo: PurchaseCreditMemo;

  @Column({ type: 'int' })
  sequence: number;

  @Column({ name: 'item_id', type: 'char', length: 36, nullable: true })
  itemId?: string;

  @Column({ name: 'account_id', type: 'char', length: 36, nullable: true })
  accountId?: string;

  @Column({ name: 'line_type', type: 'varchar', length: 50 })
  lineType: string;

  @Column({ name: 'line_object_number', type: 'varchar', length: 50, nullable: true })
  lineObjectNumber?: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  description?: string;

  @Column({ name: 'description_2', type: 'varchar', length: 250, nullable: true })
  description2?: string;

  @Column({ name: 'unit_of_measure_id', type: 'char', length: 36, nullable: true })
  unitOfMeasureId?: string;

  @Column({ name: 'unit_of_measure_code', type: 'varchar', length: 50, nullable: true })
  unitOfMeasureCode?: string;

  @Column({ name: 'unit_cost', type: 'decimal', precision: 18, scale: 4 })
  unitCost: number;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  quantity: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 18, scale: 4 })
  discountAmount: number;

  @Column({ name: 'discount_percent', type: 'decimal', precision: 7, scale: 2 })
  discountPercent: number;

  @Column({ name: 'discount_applied_before_tax', type: 'boolean' })
  discountAppliedBeforeTax: boolean;

  @Column({ name: 'amount_excluding_tax', type: 'decimal', precision: 18, scale: 4 })
  amountExcludingTax: number;

  @Column({ name: 'tax_code', type: 'varchar', length: 50, nullable: true })
  taxCode?: string;

  @Column({ name: 'tax_percent', type: 'decimal', precision: 5, scale: 2 })
  taxPercent: number;

  @Column({ name: 'total_tax_amount', type: 'decimal', precision: 18, scale: 4 })
  totalTaxAmount: number;

  @Column({ name: 'amount_including_tax', type: 'decimal', precision: 18, scale: 4 })
  amountIncludingTax: number;

  @Column({ name: 'invoice_discount_allocation', type: 'decimal', precision: 18, scale: 4 })
  invoiceDiscountAllocation: number;

  @Column({ name: 'net_amount', type: 'decimal', precision: 18, scale: 4 })
  netAmount: number;

  @Column({ name: 'net_tax_amount', type: 'decimal', precision: 18, scale: 4 })
  netTaxAmount: number;

  @Column({ name: 'net_amount_including_tax', type: 'decimal', precision: 18, scale: 4 })
  netAmountIncludingTax: number;

  @Column({ name: 'expected_receipt_date', type: 'date', nullable: true })
  expectedReceiptDate?: Date;

  @Column({ name: 'item_variant_id', type: 'char', length: 36, nullable: true })
  itemVariantId?: string;

  @Column({ name: 'location_id', type: 'char', length: 36, nullable: true })
  locationId?: string;

  @Column({ name: 'api_source', type: 'varchar', length: 10 })
  apiSource: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}