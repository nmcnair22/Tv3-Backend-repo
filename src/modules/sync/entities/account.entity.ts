import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryColumn,
    UpdateDateColumn,
} from 'typeorm';
  
  @Entity('account')
  export class Account {
    @PrimaryColumn({ type: 'char', length: 36 })
    id: string;
  
    @Column({ name: 'number', type: 'varchar', length: 50 })
    number: string;
  
    @Column({ name: 'display_name', type: 'varchar', length: 100 })
    displayName: string;
  
    @Column({ type: 'varchar', length: 50 })
    category: string;
  
    @Column({ name: 'sub_category', type: 'varchar', length: 50, nullable: true })
    subCategory?: string;
  
    @Column({ type: 'boolean' })
    blocked: boolean;
  
    @Column({ name: 'account_type', type: 'varchar', length: 50 })
    accountType: string;
  
    @Column({ name: 'direct_posting', type: 'boolean' })
    directPosting: boolean;
  
    @Column({ name: 'net_change', type: 'decimal', precision: 18, scale: 2 })
    netChange: number;
  
    @Column({ name: 'consolidation_translation_method', type: 'varchar', length: 100, nullable: true })
    consolidationTranslationMethod?: string;
  
    @Column({ name: 'consolidation_debit_account', type: 'varchar', length: 50, nullable: true })
    consolidationDebitAccount?: string;
  
    @Column({ name: 'consolidation_credit_account', type: 'varchar', length: 50, nullable: true })
    consolidationCreditAccount?: string;
  
    @Column({ name: 'exclude_from_consolidation', type: 'boolean' })
    excludeFromConsolidation: boolean;
  
    @Column({ name: 'last_modified', type: 'datetime' })
    lastModified: Date;
  
    @Column({ name: 'api_source', type: 'varchar', length: 10 })
    apiSource: string;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }