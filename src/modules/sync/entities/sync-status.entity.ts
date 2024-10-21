// src/modules/sync/entities/sync-status.entity.ts

import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('sync_status')
export class SyncStatus {
  @PrimaryColumn({ name: 'entity_name', type: 'varchar', length: 50 })
  entityName: string;

  @Column({ name: 'last_sync_date_time', type: 'datetime' })
  lastSyncDateTime: Date;
}