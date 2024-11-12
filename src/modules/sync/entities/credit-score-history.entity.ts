// src/modules/sync/entities/credit-score-history.entity.ts

import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Customer } from './customer.entity';

@Entity('credit_score_history')
@Index(['customerNumber', 'recordedAt'])
export class CreditScoreHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_number', type: 'varchar', length: 20 })
  customerNumber: string;

  @ManyToOne(() => Customer, (customer) => customer.creditScoreHistories, { onDelete: 'CASCADE' })
  customer: Customer;

  @Column({ name: 'credit_score', type: 'int' })
  creditScore: number;

  @Column({ name: 'credit_tier', type: 'varchar', length: 20 })
  creditTier: string;

  @Column({ name: 'recorded_at', type: 'datetime' })
  recordedAt: Date;

  // Existing Fields
  @Column({ name: 'total_spend', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalSpend: number;

  @Column({ name: 'average_monthly_spend', type: 'decimal', precision: 15, scale: 2, default: 0 })
  averageMonthlySpend: number;

  @Column({ name: 'on_time_payments', type: 'int', default: 0 })
  onTimePayments: number;

  @Column({ name: 'early_payments', type: 'int', default: 0 })
  earlyPayments: number;

  @Column({ name: 'late_payments', type: 'int', default: 0 })
  latePayments: number;

  @Column({ name: 'late_payments_1_30', type: 'int', default: 0 })
  latePayments1_30: number;

  @Column({ name: 'late_payments_31_60', type: 'int', default: 0 })
  latePayments31_60: number;

  @Column({ name: 'late_payments61_90', type: 'int', default: 0 })
  latePayments61_90: number;

  @Column({ name: 'late_payments90_plus', type: 'int', default: 0 })
  latePayments90Plus: number;

  @Column({ name: 'outstanding_balance', type: 'decimal', precision: 15, scale: 2, default: 0 })
  outstandingBalance: number;

  @Column({ name: 'balance_to_spend_ratio', type: 'decimal', precision: 5, scale: 2, default: 0 })
  balanceToSpendRatio: number;

  // New Fields Added
  @Column({ name: 'spend_tier', type: 'varchar', length: 20 })
  spendTier: string;

  @Column({ name: 'total_purchase_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalPurchaseAmount: number;

  @Column({ name: 'PAF', type: 'decimal', precision: 5, scale: 2, default: 0 })
  PAF: number;

  @Column({ name: 'total_timeliness_points', type: 'int', default: 0 })
  totalTimelinessPoints: number;

  @Column({ name: 'PTF', type: 'decimal', precision: 5, scale: 2, default: 0 })
  PTF: number;

  @Column({ name: 'OBF', type: 'decimal', precision: 5, scale: 2, default: 0 })
  OBF: number;
}