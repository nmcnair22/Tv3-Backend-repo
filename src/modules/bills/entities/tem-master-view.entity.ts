// src/modules/bills/entities/tem-master-view.entity.ts

import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'temMasterViewUpdated' })
export class TemMasterView {
  @PrimaryColumn()
  id: number;

  @Column({ nullable: true })
  id_vendor: string;

  @Column({ nullable: true })
  id_location: number;

  @Column({ nullable: true })
  id_provider: number;

  @Column({ nullable: true })
  id_customer: number;

  @Column({ nullable: true })
  accountNumber: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  expectedAmount: number;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  password: string;

  @Column({ nullable: true })
  url: string;

  @Column({ nullable: true })
  billType: string;

  @Column({ nullable: true })
  payType: string;

  @Column({ type: 'tinyint', nullable: true })
  multipleLocations: number;

  @Column({ nullable: true })
  created_at: Date;

  @Column({ nullable: true })
  updated_at: Date;

  @Column({ nullable: true })
  customerName: string;

  @Column({ nullable: true })
  locationName: string;

  @Column({ nullable: true })
  vendorName: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  vendorBalance: number;

  @Column({ nullable: true })
  providerName: string;

  @Column({ type: 'tinyint', nullable: true })
  status: number;

  @Column({ type: 'tinyint', nullable: true })
  flagged: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  flaggedReason: string;

  @Column({ nullable: true })
  nameOnCheck: string;

  @Column({ nullable: true })
  address1: string;

  @Column({ nullable: true })
  address2: string;

  // Removed address3 and address4

  @Column({ nullable: true })
  addressCity: string;

  @Column({ nullable: true })
  addressState: string;

  @Column({ nullable: true })
  addressZip: string;

  @Column({ type: 'tinyint', nullable: true })
  addressValidated: number;

  @Column({ nullable: true })
  lastInvoice: Date;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  lastAmount: number;
}
