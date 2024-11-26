// src/modules/bills/entities/location.entity.ts

import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { TemAccount } from './tem-account.entity';
import { TemCustomer } from './tem-customer.entity';

@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  customer_id: number;

  @Column({ length: 255, nullable: true })
  name: string;

  @Column({ type: 'int', unique: true })
  cissdm_id: number;

  @Column({ length: 50, nullable: true })
  site_number: string;

  @Column('json', { nullable: true })
  address: any;

  @Column({ length: 50, nullable: true })
  telephone: string;

  @Column('decimal', { precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column('decimal', { precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column({ length: 100, nullable: true })
  timezone: string;

  @Column({ length: 50, nullable: true })
  status: string;

  // New fields
  @Column({ type: 'tinyint', nullable: true })
  archived: boolean;

  @Column({ type: 'int', nullable: true })
  id_dynamic_location: number;

  @Column({ length: 255, nullable: true })
  location_alias: string;

  @Column({ length: 255, nullable: true })
  billing_name: string;

  @Column({ type: 'tinyint', nullable: true })
  verified: boolean;

  @Column({ length: 255, nullable: true })
  validate_msg: string;

  @Column({ length: 255, nullable: true })
  contact_name: string;

  @Column({ length: 255, nullable: true })
  billing_contact: string;

  @Column({ length: 50, nullable: true })
  store_type: string;

  @Column('text', { nullable: true })
  shipping_notes: string;

  @Column('text', { nullable: true })
  location_notes: string;

  @Column({ length: 50, nullable: true })
  building_type: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  // Relations
  @ManyToOne(() => TemCustomer, (customer) => customer.locations)
  @JoinColumn({ name: 'customer_id' })
  customer: TemCustomer;

  @OneToMany(() => TemAccount, (account) => account.location)
  accounts: TemAccount[];
}
