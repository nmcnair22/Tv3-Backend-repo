import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryColumn,
    UpdateDateColumn,
} from 'typeorm';
  
  @Entity('general_ledger_entry')
  export class GeneralLedgerEntry {
    @PrimaryColumn({ type: 'char', length: 36 })
    id: string;
  
    @Column({ name: 'entry_number', type: 'int' })
    entryNumber: number;
  
    @Column({ name: 'posting_date', type: 'date' })
    postingDate: Date;
  
    @Column({ name: 'document_number', type: 'varchar', length: 50, nullable: true })
    documentNumber?: string;
  
    @Column({ name: 'document_type', type: 'varchar', length: 50, nullable: true })
    documentType?: string;
  
    @Column({ name: 'account_id', type: 'char', length: 36, nullable: true })
    accountId?: string;
  
    @Column({ name: 'account_number', type: 'varchar', length: 50, nullable: true })
    accountNumber?: string;
  
    @Column({ type: 'varchar', length: 250, nullable: true })
    description?: string;
  
    @Column({ name: 'debit_amount', type: 'decimal', precision: 18, scale: 2 })
    debitAmount: number;
  
    @Column({ name: 'credit_amount', type: 'decimal', precision: 18, scale: 2 })
    creditAmount: number;
  
    @Column({ name: 'additional_currency_debit_amount', type: 'decimal', precision: 18, scale: 2 })
    additionalCurrencyDebitAmount: number;
  
    @Column({ name: 'additional_currency_credit_amount', type: 'decimal', precision: 18, scale: 2 })
    additionalCurrencyCreditAmount: number;
  
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