// src/modules/sync/entities/job.entity.ts

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('job')
export class Job {
  /** Primary Key: Job Number */
  @PrimaryColumn({ name: 'no', type: 'varchar', length: 20 })
  no: string;

  /** System ID (GUID) */
  @Column({ name: 'system_id', type: 'char', length: 36, nullable: true })
  systemId?: string;

  /** Description */
  @Column({ name: 'description', type: 'varchar', length: 100, nullable: true })
  description?: string;

  /** Bill To Customer Number */
  @Column({
    name: 'bill_to_customer_no',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  billToCustomerNo?: string;

  /** Status */
  @Column({ name: 'status', type: 'varchar', length: 20, nullable: true })
  status?: string;

  /** Person Responsible */
  @Column({
    name: 'person_responsible',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  personResponsible?: string;

  /** Next Invoice Date */
  @Column({ name: 'next_invoice_date', type: 'date', nullable: true })
  nextInvoiceDate?: Date;

  /** Job Posting Group */
  @Column({
    name: 'job_posting_group',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  jobPostingGroup?: string;

  /** Search Description */
  @Column({
    name: 'search_description',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  searchDescription?: string;

  /** System Created At */
  @Column({ name: 'system_created_at', type: 'datetime', nullable: true })
  systemCreatedAt?: Date;

  /** Last Modified Date Time */
  @Column({
    name: 'last_modified_date_time',
    type: 'datetime',
    nullable: true,
  })
  lastModifiedDateTime?: Date;

  /** API Source */
  @Column({ name: 'api_source', type: 'varchar', length: 10, nullable: true })
  apiSource?: string;

  /** Timestamps */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
