// src/modules/sync/entities/billing-schedule-line.entity.ts

import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryColumn,
    UpdateDateColumn,
} from 'typeorm';
  
  @Entity('billing_schedule_line')
  export class BillingScheduleLine {
    @PrimaryColumn({ name: 'bssi_arcb_billing_schedule_number', type: 'varchar', length: 50 })
    billingScheduleNumber: string;
  
    @PrimaryColumn({ name: 'line_no', type: 'int' })
    lineNo: number;
  
    @Column({ name: 'type', type: 'varchar', length: 50 })
    type: string;
  
    @Column({ name: 'item_no', type: 'varchar', length: 50, nullable: true })
    itemNo?: string;
  
    @Column({ type: 'varchar', length: 250 })
    description: string;
  
    @Column({ name: 'billing_type', type: 'varchar', length: 50 })
    billingType: string;
  
    @Column({ name: 'ship_to_code', type: 'varchar', length: 50, nullable: true })
    shipToCode?: string;
  
    // Modify the field to be nullable
    @Column({ name: 'last_modified_date_time', type: 'datetime', nullable: true })
    lastModifiedDateTime?: Date;
  
    @Column({ name: 'api_source', type: 'varchar', length: 10 })
    apiSource: string;
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  }