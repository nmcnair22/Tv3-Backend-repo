// src/modules/bills/entities/cissdm-customer.entity.ts

import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'customers' })
export class CissdmCustomer {
  @PrimaryColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  billing_name: string;

  @Column({ nullable: true })
  abbreviation: string;

  @Column({ name: 'is_active', nullable: true })
  isActive: number; // Assuming 'is_active' is stored as a number

  @Column({ nullable: true })
  id_ticketing: number;

  @Column({ nullable: true })
  billingInterval: string;

  @Column({ nullable: true })
  overageCharge: string;

  @Column({ nullable: true })
  du_alert_method: number;

  @Column({ nullable: true })
  customer_status_id: number;

  @Column({ nullable: true })
  audit_complete: number;

  @Column({ nullable: true })
  has_field_services: number;

  @Column({ nullable: true })
  fspm: string;

  // Add other fields as necessary based on your mappings
}
