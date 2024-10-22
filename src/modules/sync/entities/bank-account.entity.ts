import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryColumn,
    UpdateDateColumn,
} from 'typeorm';
  
  @Entity('bank_account')
  export class BankAccount {
    @PrimaryColumn({ type: 'char', length: 36 })
    id: string;
  
    @Column({ name: 'number', type: 'varchar', length: 50 })
    number: string;
  
    @Column({ name: 'display_name', type: 'varchar', length: 100 })
    displayName: string;
  
    @Column({ name: 'bank_account_number', type: 'varchar', length: 50, nullable: true })
    bankAccountNumber?: string;
  
    @Column({ type: 'boolean' })
    blocked: boolean;
  
    @Column({ name: 'currency_code', type: 'varchar', length: 10, nullable: true })
    currencyCode?: string;
  
    @Column({ name: 'currency_id', type: 'char', length: 36, nullable: true })
    currencyId?: string;
  
    @Column({ type: 'varchar', length: 50, nullable: true })
    iban?: string;
  
    @Column({ name: 'intercompany_enabled', type: 'boolean' })
    intercompanyEnabled: boolean;
  
    @Column({ name: 'last_modified', type: 'datetime' })
    lastModified: Date;
  
    @Column({ name: 'api_source', type: 'varchar', length: 10 })
    apiSource: string;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }