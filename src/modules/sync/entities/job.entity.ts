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
    @PrimaryColumn({ name: 'system_id', type: 'char', length: 36 })
    systemId: string;
  
    @Column({ name: 'no', type: 'varchar', length: 20 })
    no: string;
  
    @Column({ type: 'varchar', length: 250 })
    description: string;
  
    @Column({ name: 'bill_to_customer_no', type: 'varchar', length: 20 })
    billToCustomerNo: string;
  
    @Column({ type: 'varchar', length: 50 })
    status: string;
  
    @Column({ name: 'person_responsible', type: 'varchar', length: 50, nullable: true })
    personResponsible?: string;
  
    @Column({ name: 'next_invoice_date', type: 'date', nullable: true })
    nextInvoiceDate?: Date;
  
    @Column({ name: 'job_posting_group', type: 'varchar', length: 50 })
    jobPostingGroup: string;
  
    @Column({ name: 'search_description', type: 'varchar', length: 250, nullable: true })
    searchDescription?: string;
  
    @Column({ name: 'system_created_at', type: 'datetime' })
    systemCreatedAt: Date;
  
    @Column({ name: 'last_modified_date_time', type: 'datetime' })
    lastModifiedDateTime: Date;
  
    @Column({ name: 'api_source', type: 'varchar', length: 10 })
    apiSource: string;
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  }