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

  @Column({ name: 'number', type: 'varchar', length: 20 })
  number: string;

  @Column({ name: 'display_name', type: 'varchar', length: 100 })
  displayName: string;

  @Column({ name: 'last_modified_date_time', type: 'datetime', nullable: true })
  lastModifiedDateTime?: Date;

  @Column({
    name: 'bank_account_number',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  bankAccountNumber?: string;

  @Column({ type: 'boolean', nullable: true })
  blocked?: boolean;

  @Column({ name: 'currency_code', type: 'varchar', length: 10, nullable: true })
  currencyCode?: string;

  @Column({ name: 'currency_id', type: 'char', length: 36, nullable: true })
  currencyId?: string;

  @Column({ name: 'iban', type: 'varchar', length: 50, nullable: true })
  iban?: string;

  @Column({ name: 'intercompany_enabled', type: 'boolean', nullable: true })
  intercompanyEnabled?: boolean;

  // Include apiSource if it's part of your schema
  @Column({ name: 'api_source', type: 'varchar', length: 10, nullable: true })
  apiSource?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}