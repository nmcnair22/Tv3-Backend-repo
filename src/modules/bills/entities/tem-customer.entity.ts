// src/modules/bills/entities/tem-customer.entity.ts

import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Location } from './location.entity';
import { TemAccount } from './tem-account.entity';

@Entity('tem_customers')
export class TemCustomer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'int', unique: true })
  cissdm_id: number; // Original customer ID from cissdm

  @Column({ nullable: true })
  billing_name: string;

  @Column({ nullable: true })
  abbreviation: string;

  @Column({ type: 'tinyint', default: 1 })
  is_active: boolean;

  // New fields
  @Column({ nullable: true })
  id_ticketing: number;

  @Column({ length: 50, nullable: true })
  billing_interval: string;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  overage_charge: number;

  @Column({ type: 'int', nullable: true })
  du_alert_method: number;

  @Column({ type: 'int', nullable: true })
  customer_status_id: number;

  @Column({ type: 'tinyint', nullable: true })
  audit_complete: boolean;

  @Column({ type: 'tinyint', nullable: true })
  has_field_services: boolean;

  @Column({ length: 255, nullable: true })
  fspm: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  // Relations
  @OneToMany(() => TemAccount, (account) => account.customer)
  accounts: TemAccount[];

  @OneToMany(() => Location, (location) => location.customer)
  locations: Location[];
}
