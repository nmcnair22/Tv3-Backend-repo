// src/modules/sync/entities/billing-schedule-line.entity.ts

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('billing_schedule_line')
export class BillingScheduleLine {
  @PrimaryColumn({
    name: 'bssi_arcb_billing_schedule_number',
    type: 'varchar',
    length: 35,
  })
  bssiArcbBillingScheduleNumber: string;

  @PrimaryColumn({ name: 'line_no', type: 'int' })
  lineNo: number;

  @Column({ name: 'type_', type: 'varchar', nullable: true })
  type?: string;

  @Column({ name: 'item_no', type: 'varchar', length: 20, nullable: true })
  itemNo?: string;

  @Column({ name: 'description', type: 'varchar', length: 100, nullable: true })
  description?: string;

  @Column({ name: 'billing_type', type: 'varchar', nullable: true })
  billingType?: string;

  @Column({ name: 'location_code', type: 'varchar', length: 10, nullable: true })
  locationCode?: string;

  @Column({
    name: 'unit_measure_code',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  unitMeasureCode?: string;

  @Column({ name: 'pricing_method', type: 'varchar', nullable: true })
  pricingMethod?: string;

  @Column({
    name: 'price',
    type: 'decimal',
    precision: 28,
    scale: 10,
    nullable: true,
  })
  price?: number;

  @Column({
    name: 'qty',
    type: 'decimal',
    precision: 28,
    scale: 10,
    nullable: true,
  })
  qty?: number;

  @Column({
    name: 'amount',
    type: 'decimal',
    precision: 28,
    scale: 10,
    nullable: true,
  })
  amount?: number;

  @Column({ name: 'billing_frequency', type: 'varchar', nullable: true })
  billingFrequency?: string;

  @Column({
    name: 'billing_start_date',
    type: 'date',
    nullable: true,
  })
  billingStartDate?: Date;

  @Column({
    name: 'billing_end_date',
    type: 'date',
    nullable: true,
  })
  billingEndDate?: Date;

  @Column({ name: 'interval', type: 'int', nullable: true })
  interval?: number;

  @Column({
    name: 'tax_group_code',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  taxGroupCode?: string;

  @Column({ name: 'tax_liable', type: 'boolean', nullable: true })
  taxLiable?: boolean;

  @Column({
    name: 'tax_aread_code',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  taxAreadCode?: string;

  @Column({ name: 'auto_renewed', type: 'boolean', nullable: true })
  autoRenewed?: boolean;

  @Column({ name: 'usage_option', type: 'varchar', nullable: true })
  usageOption?: string;

  @Column({
    name: 'usage_identifier',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  usageIdentifier?: string;

  @Column({
    name: 'initial_reading',
    type: 'decimal',
    precision: 28,
    scale: 10,
    nullable: true,
  })
  initialReading?: number;

  @Column({ name: 'renewal_lines', type: 'int', nullable: true })
  renewalLines?: number;

  @Column({ name: 'revenue_split', type: 'boolean', nullable: true })
  revenueSplit?: boolean;

  @Column({
    name: 'parent_amount',
    type: 'decimal',
    precision: 28,
    scale: 10,
    nullable: true,
  })
  parentAmount?: number;

  @Column({ name: 'bssi_calculation_method', type: 'varchar', nullable: true })
  bssiCalculationMethod?: string;

  @Column({ name: 'bssi_dayof_invoice_date', type: 'int', nullable: true })
  bssiDayofInvoiceDate?: number;

  @Column({ name: 'bssi_numof_period', type: 'int', nullable: true })
  bssiNumofPeriod?: number;

  @Column({
    name: 'bssi_alignment_date',
    type: 'date',
    nullable: true,
  })
  bssiAlignmentDate?: Date;

  @Column({
    name: 'bssi_estimated_qty',
    type: 'decimal',
    precision: 28,
    scale: 10,
    nullable: true,
  })
  bssiEstimatedQty?: number;

  @Column({ name: 'bssi_status', type: 'varchar', nullable: true })
  bssiStatus?: string;

  @Column({
    name: 'bssi_udf_l1',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  bssiUdfL1?: string;

  @Column({
    name: 'bssi_udf_l2',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  bssiUdfL2?: string;

  @Column({
    name: 'bssi_udf_l3',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  bssiUdfL3?: string;

  @Column({
    name: 'bssi_udf_l4',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  bssiUdfL4?: string;

  @Column({
    name: 'bssi_udf_l5',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  bssiUdfL5?: string;

  @Column({ name: 'bssi_udf_l6', type: 'date', nullable: true })
  bssiUdfL6?: Date;

  @Column({ name: 'bssi_udf_l7', type: 'bigint', nullable: true })
  bssiUdfL7?: number;

  @Column({ name: 'bssi_udf_l8', type: 'boolean', nullable: true })
  bssiUdfL8?: boolean;

  @Column({
    name: 'bssi_udf_l9',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  bssiUdfL9?: string;

  @Column({
    name: 'bssi_udf_l10',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  bssiUdfL10?: string;

  @Column({
    name: 'bssi_udf_l11',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  bssiUdfL11?: string;

  @Column({
    name: 'bssi_udf_l12',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  bssiUdfL12?: string;

  @Column({
    name: 'bssi_udf_l13',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  bssiUdfL13?: string;

  @Column({ name: 'bssi_udf_l14', type: 'date', nullable: true })
  bssiUdfL14?: Date;

  @Column({ name: 'bssi_udf_l15', type: 'date', nullable: true })
  bssiUdfL15?: Date;

  @Column({ name: 'bssi_udf_l16', type: 'date', nullable: true })
  bssiUdfL16?: Date;

  @Column({ name: 'bssi_udf_l17', type: 'date', nullable: true })
  bssiUdfL17?: Date;

  @Column({ name: 'bssi_udf_l18', type: 'bigint', nullable: true })
  bssiUdfL18?: number;

  @Column({ name: 'bssi_udf_l19', type: 'boolean', nullable: true })
  bssiUdfL19?: boolean;

  @Column({
    name: 'shortcut_dimension1_code',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  shortcutDimension1Code?: string;

  @Column({
    name: 'shortcut_dimension2_code',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  shortcutDimension2Code?: string;

  @Column({ name: 'bssi_shortcut_dimension3', type: 'varchar', nullable: true })
  bssiShortcutDimension3?: string;

  @Column({ name: 'bssi_shortcut_dimension4', type: 'varchar', nullable: true })
  bssiShortcutDimension4?: string;

  @Column({ name: 'bssi_shortcut_dimension5', type: 'varchar', nullable: true })
  bssiShortcutDimension5?: string;

  @Column({ name: 'bssi_shortcut_dimension6', type: 'varchar', nullable: true })
  bssiShortcutDimension6?: string;

  @Column({ name: 'bssi_shortcut_dimension7', type: 'varchar', nullable: true })
  bssiShortcutDimension7?: string;

  @Column({ name: 'bssi_shortcut_dimension8', type: 'varchar', nullable: true })
  bssiShortcutDimension8?: string;

  @Column({ name: 'bssi_accumulate_import', type: 'boolean', nullable: true })
  bssiAccumulateImport?: boolean;

  @Column({ name: 'shipto_code', type: 'varchar', length: 20, nullable: true })
  shiptoCode?: string;

  // Include apiSource if it's part of your schema
  @Column({ name: 'api_source', type: 'varchar', length: 10, nullable: true })
  apiSource?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}