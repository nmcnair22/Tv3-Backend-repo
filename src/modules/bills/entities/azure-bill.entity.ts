// src/modules/bills/entities/azure-bill.entity.ts

import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity()
@Unique(['fingerprint'])
export class AzureBill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  billType: string; // SLB or MLB

  @Column('text')
  fieldValues: string; // JSON string of ExtractedData

  @Column('text', { nullable: true })
  validationResult?: string; // JSON string

  @Column('text', { nullable: true })
  fileName: string;

  @Column({ unique: true })
  fingerprint: string;

  @CreateDateColumn()
  processedAt: Date;
}
