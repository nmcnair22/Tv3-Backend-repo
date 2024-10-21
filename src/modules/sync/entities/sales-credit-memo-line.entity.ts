// src/modules/sync/entities/sales-credit-memo-line.entity.ts

import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Item } from './item.entity';
import { SalesCreditMemo } from './sales-credit-memo.entity';
  
  @Entity('sales_credit_memo_line')
  export class SalesCreditMemoLine {
    /** Primary Key: Line ID from the API */
    @PrimaryColumn({ type: 'char', length: 36 })
    id: string;
  
  /** Foreign Key: Reference to SalesCreditMemo */
  @Column({ name: 'sales_credit_memo_id', type: 'char', length: 36 })
  salesCreditMemoId: string;

  @ManyToOne(() => SalesCreditMemo, (salesCreditMemo) => salesCreditMemo.salesCreditMemoLines)
  @JoinColumn({ name: 'sales_credit_memo_id' })
  salesCreditMemo: SalesCreditMemo;

  /** Sequence Number */
  @Column({ type: 'int' })
  sequence: number;

  /** Item Reference */
  @Column({ name: 'item_id', type: 'char', length: 36, nullable: true })
  itemId?: string;
  
    @ManyToOne(() => Item)
    @JoinColumn({ name: 'item_id' })
    item?: Item;
  
    /** Account ID */
    @Column({ name: 'account_id', type: 'char', length: 36, nullable: true })
    accountId?: string;
  
    /** Line Type */
    @Column({ name: 'line_type', type: 'varchar', length: 50 })
    lineType: string;
  
    /** Line Object Number */
    @Column({ name: 'line_object_number', type: 'varchar', length: 50, nullable: true })
    lineObjectNumber?: string;
  
    /** Description */
    @Column({ type: 'varchar', length: 250, nullable: true })
    description?: string;
  
    /** Description 2 */
    @Column({ name: 'description_2', type: 'varchar', length: 250, nullable: true })
    description2?: string;
  
    /** Unit of Measure */
    @Column({ name: 'unit_of_measure_id', type: 'char', length: 36, nullable: true })
    unitOfMeasureId?: string;
  
    @Column({ name: 'unit_of_measure_code', type: 'varchar', length: 50, nullable: true })
    unitOfMeasureCode?: string;
  
    /** Unit Price */
    @Column({ name: 'unit_price', type: 'decimal', precision: 18, scale: 4 })
    unitPrice: number;
  
    /** Quantity */
    @Column({ type: 'decimal', precision: 18, scale: 4 })
    quantity: number;
  
    /** Discount Amount */
    @Column({ name: 'discount_amount', type: 'decimal', precision: 18, scale: 4 })
    discountAmount: number;

    @Column({ name: 'expected_receipt_date', type: 'date', nullable: true })
    expectedReceiptDate?: Date;
    
  
    /** Discount Percent */
    @Column({ name: 'discount_percent', type: 'decimal', precision: 5, scale: 2 })
    discountPercent: number;
  
    /** Discount Applied Before Tax */
    @Column({ name: 'discount_applied_before_tax', type: 'boolean' })
    discountAppliedBeforeTax: boolean;
  
    /** Amount Excluding Tax */
    @Column({ name: 'amount_excluding_tax', type: 'decimal', precision: 18, scale: 4 })
    amountExcludingTax: number;
  
    /** Tax Code */
    @Column({ name: 'tax_code', type: 'varchar', length: 50, nullable: true })
    taxCode?: string;
  
    /** Tax Percent */
    @Column({ name: 'tax_percent', type: 'decimal', precision: 5, scale: 2 })
    taxPercent: number;
  
    /** Total Tax Amount */
    @Column({ name: 'total_tax_amount', type: 'decimal', precision: 18, scale: 4 })
    totalTaxAmount: number;
  
    /** Amount Including Tax */
    @Column({ name: 'amount_including_tax', type: 'decimal', precision: 18, scale: 4 })
    amountIncludingTax: number;
  
    /** Invoice Discount Allocation */
    @Column({ name: 'invoice_discount_allocation', type: 'decimal', precision: 18, scale: 4 })
    invoiceDiscountAllocation: number;
  
    /** Net Amount */
    @Column({ name: 'net_amount', type: 'decimal', precision: 18, scale: 4 })
    netAmount: number;
  
    /** Net Tax Amount */
    @Column({ name: 'net_tax_amount', type: 'decimal', precision: 18, scale: 4 })
    netTaxAmount: number;
  
    /** Net Amount Including Tax */
    @Column({ name: 'net_amount_including_tax', type: 'decimal', precision: 18, scale: 4 })
    netAmountIncludingTax: number;
  
    /** Shipment Date */
    @Column({ name: 'shipment_date', type: 'date', nullable: true })
    shipmentDate?: Date;
  
    /** Item Variant ID */
    @Column({ name: 'item_variant_id', type: 'char', length: 36, nullable: true })
    itemVariantId?: string;
  
    /** Location ID */
    @Column({ name: 'location_id', type: 'char', length: 36, nullable: true })
    locationId?: string;
  
    /** API Source */
    @Column({ name: 'api_source', type: 'varchar', length: 10 })
    apiSource: string;
  
    /** Timestamps */
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  }