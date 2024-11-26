// src/modules/bills/entities/tem-vendor.entity.ts

import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { TemAccount } from './tem-account.entity';

@Entity('tem_vendors')
export class TemVendor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'int', unique: true })
  tem_vendor_id: number;

  @Column({ length: 100, nullable: true })
  short_name: string;

  @Column({ length: 255, nullable: true })
  name_on_check: string;

  @Column('json', { nullable: true })
  address: any;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ type: 'tinyint', default: 1 })
  is_active: boolean;

  @Column({ type: 'tinyint', default: 0 })
  validated: boolean;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  // Relations

  @OneToMany(() => TemAccount, (account) => account.vendor)
  accounts: TemAccount[];
}
