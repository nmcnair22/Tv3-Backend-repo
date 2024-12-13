// src/modules/bills/entities/processing-invoice-table.entity.ts
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { ProcessingInvoiceTableCell } from './processing-invoice-table-cell.entity';
import { ProcessingInvoice } from './processing-invoice.entity';

@Entity('processing_invoice_tables')
export class ProcessingInvoiceTable {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ProcessingInvoice, (invoice) => invoice.tables, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invoice_id' }) // Specify the exact column name for the foreign key
  invoice: ProcessingInvoice;

  @Column({ type: 'int' })
  row_count: number;

  @Column({ type: 'int' })
  column_count: number;

  @OneToMany(() => ProcessingInvoiceTableCell, (cell) => cell.table, {
    cascade: true,
  })
  cells: ProcessingInvoiceTableCell[];

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
