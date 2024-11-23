// src/modules/bills/entities/tem-master-view-updated.entity.ts

import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'temMasterViewUpdated' })
export class TemMasterViewUpdated {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'id_vendor', type: 'varchar', length: 255, nullable: true })
  id_vendor: string;

  @Column({ name: 'id_location', type: 'varchar', length: 255, nullable: true })
  id_location: string;

  @Column({ name: 'id_provider', type: 'varchar', length: 255, nullable: true })
  id_provider: string;

  @Column({ name: 'id_customer', type: 'varchar', length: 255, nullable: true })
  id_customer: string;

  @Column({
    name: 'accountNumber',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  accountNumber: string;

  @Column({
    name: 'expectedAmount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  expectedAmount: number;

  @Column({ name: 'username', type: 'varchar', length: 255, nullable: true })
  username: string;

  @Column({ name: 'password', type: 'varchar', length: 255, nullable: true })
  password: string;

  @Column({ name: 'url', type: 'varchar', length: 255, nullable: true })
  url: string;

  @Column({ name: 'billType', type: 'varchar', length: 255, nullable: true })
  billType: string;

  @Column({ name: 'payType', type: 'varchar', length: 255, nullable: true })
  payType: string;

  @Column({ name: 'multipleLocations', type: 'tinyint', nullable: true })
  multipleLocations: number;

  @Column({ name: 'created_at', type: 'datetime', nullable: true })
  created_at: Date;

  @Column({ name: 'updated_at', type: 'datetime', nullable: true })
  updated_at: Date;

  @Column({
    name: 'customerName',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  customerName: string;

  @Column({
    name: 'locationName',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  locationName: string;

  @Column({ name: 'vendorName', type: 'varchar', length: 255, nullable: true })
  vendorName: string;

  @Column({
    name: 'vendorBalance',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  vendorBalance: number;

  @Column({
    name: 'providerName',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  providerName: string;

  @Column({ name: 'status', type: 'tinyint', nullable: true })
  status: number;

  @Column({ name: 'flagged', type: 'tinyint', nullable: true })
  flagged: number;

  @Column({ name: 'flaggedReason', type: 'text', nullable: true })
  flaggedReason: string;

  @Column({ name: 'nameOnCheck', type: 'varchar', length: 255, nullable: true })
  nameOnCheck: string;

  @Column({ name: 'address1', type: 'varchar', length: 255, nullable: true })
  address1: string;

  @Column({ name: 'address2', type: 'varchar', length: 255, nullable: true })
  address2: string;

  @Column({ name: 'addressCity', type: 'varchar', length: 255, nullable: true })
  addressCity: string;

  @Column({
    name: 'addressState',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  addressState: string;

  @Column({ name: 'addressZip', type: 'varchar', length: 20, nullable: true })
  addressZip: string;

  @Column({ name: 'addressValidated', type: 'tinyint', nullable: true })
  addressValidated: number;

  @Column({ name: 'lastInvoice', type: 'date', nullable: true })
  lastInvoice: Date;

  @Column({
    name: 'lastAmount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  lastAmount: number;

  // Add any additional fields that exist in the table but were not included in the sample data
}
