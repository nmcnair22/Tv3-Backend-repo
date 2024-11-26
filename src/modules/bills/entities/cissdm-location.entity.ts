// src/modules/bills/entities/cissdm-location.entity.ts

import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'locations' })
export class CissdmLocation {
  @PrimaryColumn()
  id: number;

  @Column({ name: 'id_Customer', nullable: true })
  id_customer: number;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  siteNumber: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  suite: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  zipcode: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  telephone: string;

  @Column('decimal', { precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column('decimal', { precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column({ nullable: true })
  timezone: string;

  @Column({ nullable: true })
  location_alias: string;

  @Column({ nullable: true })
  archived: number;

  @Column({ nullable: true })
  id_dynamic_location: number;

  @Column({ nullable: true })
  validateMsg: string;

  @Column({ nullable: true })
  verified: number;

  @Column({ nullable: true })
  contact_name: string;

  @Column({ nullable: true })
  billing_contact: string;

  @Column({ nullable: true })
  store_type: string;

  @Column({ nullable: true })
  shipping_notes: string;

  @Column({ nullable: true })
  location_notes: string;

  @Column({ nullable: true })
  building_type: string;

  @Column({ nullable: true })
  status: string;

  // Add other fields as necessary based on your mappings
}
