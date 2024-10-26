// src/modules/sync/entities/ship-to-address.entity.ts

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('ship_to_address')
export class ShipToAddress {
  /** Composite Primary Key: customerNo and code */
  @PrimaryColumn({ name: 'customer_no', type: 'varchar', length: 20 })
  customerNo: string;

  @PrimaryColumn({ name: 'code', type: 'varchar', length: 10 })
  code: string;

  /** System ID (GUID) */
  @Column({ name: 'system_id', type: 'char', length: 36, nullable: true })
  systemId?: string;

  /** Name */
  @Column({ name: 'name', type: 'varchar', length: 100, nullable: true })
  name?: string;

  /** Name 2 */
  @Column({ name: 'name2', type: 'varchar', length: 50, nullable: true })
  name2?: string;

  /** Address */
  @Column({ name: 'address', type: 'varchar', length: 100, nullable: true })
  address?: string;

  /** Address 2 */
  @Column({ name: 'address2', type: 'varchar', length: 50, nullable: true })
  address2?: string;

  /** Post Code */
  @Column({ name: 'post_code', type: 'varchar', length: 20, nullable: true })
  postCode?: string;

  /** City */
  @Column({ name: 'city', type: 'varchar', length: 30, nullable: true })
  city?: string;

  /** State */
  @Column({ name: 'state', type: 'varchar', length: 30, nullable: true })
  state?: string;

  /** Country/Region Code */
  @Column({
    name: 'country_region_code',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  countryRegionCode?: string;

  /** Email */
  @Column({ name: 'email', type: 'varchar', length: 80, nullable: true })
  email?: string;

  /** Phone Number */
  @Column({ name: 'phone_no', type: 'varchar', length: 30, nullable: true })
  phoneNo?: string;

  /** Fax Number */
  @Column({ name: 'fax_no', type: 'varchar', length: 30, nullable: true })
  faxNo?: string;

  /** Contact */
  @Column({ name: 'contact', type: 'varchar', length: 100, nullable: true })
  contact?: string;

  /** GLN */
  @Column({ name: 'gln', type: 'varchar', length: 13, nullable: true })
  gln?: string;

  /** Cross Reference Code */
  @Column({
    name: 'cissdm_cross_reference_code',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  cissdmCrossReferenceCode?: string;

  /** Customer Cost Center Code */
  @Column({
    name: 'cissdm_customer_cost_center_code',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  cissdmCustomerCostCenterCode?: string;

  /** System Created At */
  @Column({ name: 'system_created_at', type: 'datetime', nullable: true })
  systemCreatedAt?: Date;

  /** Last Modified Date Time */
  @Column({
    name: 'last_modified_date_time',
    type: 'datetime',
    nullable: true,
  })
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