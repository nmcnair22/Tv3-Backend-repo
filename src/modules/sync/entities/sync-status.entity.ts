// src/modules/sync/entities/sync-status.entity.ts

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sync_status')
export class SyncStatus {
  @PrimaryColumn({ name: 'entity_name', type: 'varchar', length: 50 })
  entityName: string;

  @Column({ name: 'last_sync_date_time', type: 'datetime', nullable: true })
  lastSyncDateTime?: Date;

  // Optional: Include apiSource if tracking per API source is needed
  // @PrimaryColumn({ name: 'api_source', type: 'varchar', length: 10 })
  // apiSource: string;

  /** Timestamps */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}