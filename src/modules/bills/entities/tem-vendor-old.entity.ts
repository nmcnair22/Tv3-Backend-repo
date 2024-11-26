// src/modules/bills/entities/tem-vendor-old.entity.ts

import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'vendors' })
export class TemVendorOld {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id: string; // 'id' is a string in the 'vendors' table

  @Column({ nullable: true })
  name: string;

  @Column({ name: 'nameOnCheck', nullable: true })
  nameOnCheck: string;

  @Column({ nullable: true })
  address1: string;

  @Column({ nullable: true })
  address2: string;

  @Column({ nullable: true })
  address3: string;

  @Column({ nullable: true })
  address4: string;

  @Column({ nullable: true })
  addressCity: string;

  @Column({ nullable: true })
  addressState: string;

  @Column({ nullable: true })
  addressZip: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  isActive: number;

  // Add other fields as necessary based on your mappings
}
