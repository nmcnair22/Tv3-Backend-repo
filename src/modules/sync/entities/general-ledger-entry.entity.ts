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
  
    @Column({ name: 'entry_number', type: 'int', nullable: true })
    entryNumber?: number;
  
    @Column({ name: 'posting_date', type: 'date', nullable: true })
    postingDate?: Date;
  
    @Column({
      name: 'document_number',
      type: 'varchar',
      length: 20,
      nullable: true,
    })
    documentNumber?: string;
  
    @Column({
      name: 'document_type',
      type: 'varchar',
      length: 50,
      nullable: true,
    })
    documentType?: string;
  
    @Column({ name: 'account_id', type: 'char', length: 36, nullable: true })
    accountId?: string;
  
    @Column({
      name: 'account_number',
      type: 'varchar',
      length: 20,
      nullable: true,
    })
    accountNumber?: string;
  
    @Column({
      name: 'description',
      type: 'varchar',
      length: 100,
      nullable: true,
    })
    description?: string;
  
    @Column({
      name: 'debit_amount',
      type: 'decimal',
      precision: 28,
      scale: 10,
      nullable: true,
    })
    debitAmount?: number;
  
    @Column({
      name: 'credit_amount',
      type: 'decimal',
      precision: 28,
      scale: 10,
      nullable: true,
    })
    creditAmount?: number;
  
    @Column({
      name: 'additional_currency_debit_amount',
      type: 'decimal',
      precision: 28,
      scale: 10,
      nullable: true,
    })
    additionalCurrencyDebitAmount?: number;
  
    @Column({
      name: 'additional_currency_credit_amount',
      type: 'decimal',
      precision: 28,
      scale: 10,
      nullable: true,
    })
    additionalCurrencyCreditAmount?: number;
  
    @Column({
      name: 'last_modified_date_time',
      type: 'datetime',
      nullable: true,
    })
    lastModifiedDateTime?: Date;
  
    // Include apiSource if it's part of your schema
    @Column({
      name: 'api_source',
      type: 'varchar',
      length: 10,
      nullable: true,
    })
    apiSource?: string;
  
    /** Timestamps */
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  }