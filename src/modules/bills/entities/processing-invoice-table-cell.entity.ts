// src/modules/bills/entities/processing-invoice-table-cell.entity.ts
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { ProcessingInvoiceTable } from './processing-invoice-table.entity';

@Entity('processing_invoice_table_cells')
export class ProcessingInvoiceTableCell {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ProcessingInvoiceTable, (table) => table.cells, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'table_id' }) // Specify the foreign key column name
  table: ProcessingInvoiceTable;

  @Column({ type: 'int' })
  row_index: number;

  @Column({ type: 'int' })
  column_index: number;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
