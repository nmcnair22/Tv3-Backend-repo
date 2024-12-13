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
import { Location } from './location.entity';
import { TemBill } from './tem-bill.entity';
import { TemCustomer } from './tem-customer.entity';
import { TemVendor } from './tem-vendor.entity';

@Entity('tem_accounts')
export class TemAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  vendor_id: number;

  @Column({ length: 255 })
  account_number: string;

  @Column({ type: 'boolean', default: false })
  missing_bill_flag: boolean;

  @Column({ nullable: true })
  customer_id: number;

  @Column({ nullable: true })
  location_id: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  expected_amount: number;

  @Column({ length: 255, nullable: true })
  username: string;

  @Column({ length: 255, nullable: true })
  password: string;

  @Column({ length: 255, nullable: true })
  url: string;

  @Column({ length: 100, nullable: true })
  bill_type: string;

  @Column({ length: 50, nullable: true })
  pay_type: string;

  @Column({ type: 'tinyint', nullable: true })
  multiple_locations: boolean;

  @Column({ type: 'tinyint', default: 1 })
  status: boolean;

  @Column({ type: 'tinyint', default: 0 })
  flagged: boolean;

  @Column({ length: 255, nullable: true })
  flagged_reason: string;

  @Column({ length: 255, nullable: true })
  name_on_check: string;

  @Column('json', { nullable: true })
  address: any;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  balance: number;

  @Column({ length: 50, nullable: true })
  account_type: string; // Mapped from accountType

  @Column({ length: 255, nullable: true })
  payment_term_id: string; // Mapped from paymentTermId

  @Column({ type: 'tinyint', nullable: true })
  send_notifications: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_balance_update: Date;

  @Column({ length: 255, nullable: true })
  provider_name: string;

  @Column({ length: 255, nullable: true })
  address1: string;

  @Column({ length: 255, nullable: true })
  address2: string;

  @Column({ length: 255, nullable: true })
  address3: string;

  @Column({ length: 255, nullable: true })
  address4: string;

  @Column({ length: 100, nullable: true })
  address_city: string;

  @Column({ length: 100, nullable: true })
  address_state: string;

  @Column({ length: 20, nullable: true })
  address_zip: string;

  @Column({ type: 'tinyint', nullable: true })
  address_validated: boolean;

  @Column({ type: 'date', nullable: true })
  last_invoice: Date;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  last_amount: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  vendor_balance: number;

  @Column({ type: 'tinyint', nullable: true })
  is_active: boolean;

  @Column({ length: 100, nullable: true })
  short_name: string;

  @Column({ length: 255, nullable: true })
  company_name: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ length: 50, nullable: true })
  pay_by: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ type: 'tinyint', nullable: true })
  validated: boolean;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  @ManyToOne(() => TemVendor)
  @JoinColumn({ name: 'vendor_id' })
  vendor: TemVendor;

  @ManyToOne(() => TemCustomer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: TemCustomer;

  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @OneToMany(() => TemBill, (bill) => bill.account)
  bills: TemBill[];
}
