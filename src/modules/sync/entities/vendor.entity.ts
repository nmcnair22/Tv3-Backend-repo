// src/modules/sync/entities/vendor.entity.ts

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('vendor')
@Index(['number', 'apiSource'], { unique: true })
export class Vendor {
  /** Primary Key: Vendor ID from the API */
  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  /** Vendor Number */
  @Column({ name: 'number', type: 'varchar', length: 20 })
  number: string;

  /** Display Name */
  @Column({ name: 'display_name', type: 'varchar', length: 100, nullable: true })
  displayName?: string;

  /** Address Line 1 */
  @Column({ name: 'address_line1', type: 'varchar', length: 100, nullable: true })
  addressLine1?: string;

  /** Address Line 2 */
  @Column({ name: 'address_line2', type: 'varchar', length: 50, nullable: true })
  addressLine2?: string;

  /** City */
  @Column({ name: 'city', type: 'varchar', length: 30, nullable: true })
  city?: string;

  /** State */
  @Column({ name: 'state', type: 'varchar', length: 30, nullable: true })
  state?: string;

  /** Country */
  @Column({ name: 'country', type: 'varchar', length: 10, nullable: true })
  country?: string;

  /** Postal Code */
  @Column({ name: 'postal_code', type: 'varchar', length: 20, nullable: true })
  postalCode?: string;

  /** Phone Number */
  @Column({ name: 'phone_number', type: 'varchar', length: 30, nullable: true })
  phoneNumber?: string;

  /** Email */
  @Column({ name: 'email', type: 'varchar', length: 80, nullable: true })
  email?: string;

  /** Website */
  @Column({ name: 'website', type: 'varchar', length: 80, nullable: true })
  website?: string;

  /** Tax Registration Number */
  @Column({ name: 'tax_registration_number', type: 'varchar', nullable: true })
  taxRegistrationNumber?: string;

  /** Currency Code */
  @Column({ name: 'currency_code', type: 'varchar', length: 10, nullable: true })
  currencyCode?: string;

  /** IRS 1099 Code */
  @Column({ name: 'irs1099_code', type: 'varchar', nullable: true })
  irs1099Code?: string;

  /** Payment Terms Code */
  @Column({ name: 'payment_terms_code', type: 'varchar', length: 10, nullable: true })
  paymentTermsCode?: string;

  /** Payment Method Code */
  @Column({ name: 'payment_method_code', type: 'varchar', length: 10, nullable: true })
  paymentMethodCode?: string;

  /** Tax Liable */
  @Column({ name: 'tax_liable', type: 'boolean', nullable: true })
  taxLiable?: boolean;

  /** Blocked Status */
  @Column({ name: 'blocked', type: 'varchar', length: 20, nullable: true })
  blocked?: string;

  /** Balance */
  @Column({
    name: 'balance',
    type: 'decimal',
    precision: 28,
    scale: 10,
    nullable: true,
  })
  balance?: number;

  /** Last Modified Date Time */
  @Column({ name: 'last_modified_date_time', type: 'datetime', nullable: true })
  lastModifiedDateTime?: Date;

  /** API Source */
  @Column({ name: 'api_source', type: 'varchar', length: 10, nullable: true })
  apiSource?: string;

  /** Timestamps */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}