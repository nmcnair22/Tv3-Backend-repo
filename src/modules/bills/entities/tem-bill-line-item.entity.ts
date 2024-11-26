// src/modules/bills/entities/tem-bill-line-item.entity.ts

import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { TemBill } from './tem-bill.entity';

@Entity('tem_bill_line_items')
export class TemBillLineItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  bill_id: number;

  @Column({ length: 255, nullable: true })
  description: string;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  amount: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  quantity: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  unit_price: number;

  @Column({ length: 255, nullable: true })
  product_code: string;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  tax: number;

  @Column({ length: 255, nullable: true })
  tax_rate: string;

  @Column({ length: 255, nullable: true })
  unit: string;

  @Column({ length: 255, nullable: true })
  category: string;

  @Column({ length: 255, nullable: true })
  subcategory: string;

  @Column('json', { nullable: true })
  other_fields: any;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  // Relations

  @ManyToOne(() => TemBill, (bill) => bill.line_items)
  @JoinColumn({ name: 'bill_id' })
  bill: TemBill;
}
