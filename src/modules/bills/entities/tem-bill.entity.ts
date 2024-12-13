import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { TemAccount } from './tem-account.entity';
import { TemBillLineItem } from './tem-bill-line-item.entity';

@Entity('tem_bills')
@Unique(['fingerprint'])
export class TemBill {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  account_id: number;

  @Column({ length: 255, nullable: true })
  invoice_id: string;

  @Column({ type: 'date', nullable: true })
  invoice_date: string;

  @Column({ type: 'date', nullable: true })
  due_date: string;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  amount_due: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  invoice_total: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  previous_unpaid_balance: number;

  @Column({ length: 50, nullable: true })
  validation_status: string;

  @Column({ type: 'int', nullable: true })
  validation_level: number;

  @Column('json', { nullable: true })
  validation_errors: any;

  @Column({ length: 50, nullable: true })
  bill_type: string;

  @Column({ type: 'tinyint', default: 0 })
  audit_flag: boolean;

  @Column({ length: 64, nullable: true })
  fingerprint: string;

  @Column({ length: 50, nullable: true })
  status: string;

  @Column('text', { nullable: true })
  notes: string;

  @Column({ length: 255, nullable: true })
  archived_file_path: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  @ManyToOne(() => TemAccount, (account) => account.bills)
  @JoinColumn({ name: 'account_id' })
  account: TemAccount;

  @OneToMany(() => TemBillLineItem, (lineItem) => lineItem.bill, {
    cascade: true,
  })
  line_items: TemBillLineItem[];
}
