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
  
    @Column({ name: 'number', type: 'varchar', length: 20 })
    number: string;
  
    @Column({ name: 'display_name', type: 'varchar', length: 100, nullable: true })
    displayName?: string;
  
    @Column({ type: 'varchar', length: 50, nullable: true })
    category?: string;
  
    @Column({ name: 'sub_category', type: 'varchar', length: 80, nullable: true })
    subCategory?: string;
  
    @Column({ type: 'boolean', nullable: true })
    blocked?: boolean;
  
    @Column({ name: 'account_type', type: 'varchar', length: 20, nullable: true })
    accountType?: string;
  
    @Column({ name: 'direct_posting', type: 'boolean', nullable: true })
    directPosting?: boolean;
  
    @Column({
      name: 'net_change',
      type: 'decimal',
      precision: 28,
      scale: 10,
      nullable: true,
    })
    netChange?: number;
  
    @Column({
      name: 'consolidation_translation_method',
      type: 'varchar',
      length: 100,
      nullable: true,
    })
    consolidationTranslationMethod?: string;
  
    @Column({
      name: 'consolidation_debit_account',
      type: 'varchar',
      length: 20,
      nullable: true,
    })
    consolidationDebitAccount?: string;
  
    @Column({
      name: 'consolidation_credit_account',
      type: 'varchar',
      length: 20,
      nullable: true,
    })
    consolidationCreditAccount?: string;
  
    @Column({ name: 'exclude_from_consolidation', type: 'boolean', nullable: true })
    excludeFromConsolidation?: boolean;
  
    @Column({ name: 'last_modified_date_time', type: 'datetime', nullable: true })
    lastModifiedDateTime?: Date;
  
    // Include apiSource if it's part of your schema
    @Column({ name: 'api_source', type: 'varchar', length: 10, nullable: true })
    apiSource?: string;
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  }