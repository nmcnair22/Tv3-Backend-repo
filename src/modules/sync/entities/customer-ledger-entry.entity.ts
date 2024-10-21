import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryColumn,
    UpdateDateColumn,
} from 'typeorm';
  
  @Entity('customer_ledger_entry')
  export class CustomerLedgerEntry {
    @PrimaryColumn({ name: 'entry_no', type: 'int' })
    entryNo: number;
  
    @Column({ name: 'posting_date', type: 'date' })
    postingDate: Date;
  
    @Column({ name: 'document_date', type: 'date', nullable: true })
    documentDate?: Date;
  
    @Column({ name: 'document_type', type: 'varchar', length: 50, nullable: true })
    documentType?: string;
  
    @Column({ name: 'document_no', type: 'varchar', length: 50, nullable: true })
    documentNo?: string;
  
    @Column({ type: 'varchar', length: 250, nullable: true })
    description?: string;
  
    @Column({ name: 'customer_name', type: 'varchar', length: 100, nullable: true })
    customerName?: string;
  
    @Column({ name: 'customer_no', type: 'varchar', length: 50, nullable: true })
    customerNo?: string;
  
    @Column({ type: 'decimal', precision: 18, scale: 2 })
    amount: number;
  
    @Column({ name: 'amount_lcy', type: 'decimal', precision: 18, scale: 2 })
    amountLCY: number;
  
    @Column({ name: 'debit_amount', type: 'decimal', precision: 18, scale: 2 })
    debitAmount: number;
  
    @Column({ name: 'credit_amount', type: 'decimal', precision: 18, scale: 2 })
    creditAmount: number;
  
    @Column({ name: 'remaining_amount', type: 'decimal', precision: 18, scale: 2 })
    remainingAmount: number;
  
    @Column({ name: 'remaining_amt_lcy', type: 'decimal', precision: 18, scale: 2 })
    remainingAmtLCY: number;
  
    @Column({ name: 'due_date', type: 'date', nullable: true })
    dueDate?: Date;
  
    @Column({ name: 'last_modified', type: 'datetime' })
    lastModified: Date;
  
    @Column({ name: 'api_source', type: 'varchar', length: 10 })
    apiSource: string;
  
    /** Timestamps */
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  }