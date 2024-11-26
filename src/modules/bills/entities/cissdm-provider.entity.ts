// src/modules/bills/entities/cissdm-provider.entity.ts

import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'providers' })
export class CissdmProvider {
  @PrimaryColumn()
  id: number;

  @Column({ nullable: true })
  carriername: string;

  // Add other fields as necessary based on your mappings
}
