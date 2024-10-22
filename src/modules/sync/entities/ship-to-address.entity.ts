// src/modules/sync/entities/ship-to-address.entity.ts

import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryColumn,
    UpdateDateColumn,
} from 'typeorm';
  
  @Entity('ship_to_address')
  export class ShipToAddress {
    @PrimaryColumn({ name: 'system_id', type: 'char', length: 36 })
    systemId: string;
  
    @Column({ name: 'customer_no', type: 'varchar', length: 20 })
    customerNo: string;
  
    @Column({ type: 'varchar', length: 50 })
    code: string;
  
    @Column({ type: 'varchar', length: 100 })
    name: string;
  
    @Column({ type: 'varchar', length: 100, nullable: true })
    name2?: string;
  
    @Column({ type: 'varchar', length: 100, nullable: true })
    address?: string;
  
    @Column({ type: 'varchar', length: 100, nullable: true })
    address2?: string;
  
    @Column({ name: 'post_code', type: 'varchar', length: 20, nullable: true })
    postCode?: string;
  
    @Column({ type: 'varchar', length: 50, nullable: true })
    city?: string;
  
    @Column({ type: 'varchar', length: 50, nullable: true })
    state?: string;
  
    @Column({ name: 'country_region_code', type: 'varchar', length: 10, nullable: true })
    countryRegionCode?: string;
  
    @Column({ name: 'email', type: 'varchar', length: 80, nullable: true })
    email?: string;
  
    @Column({ name: 'phone_no', type: 'varchar', length: 30, nullable: true })
    phoneNo?: string;
  
    @Column({ name: 'fax_no', type: 'varchar', length: 30, nullable: true })
    faxNo?: string;
  
    @Column({ type: 'varchar', length: 80, nullable: true })
    contact?: string;
  
    @Column({ type: 'varchar', length: 50, nullable: true })
    gln?: string;
  
    @Column({ name: 'cissdm_cross_reference_code', type: 'varchar', length: 50, nullable: true })
    cissdmCrossReferenceCode?: string;
  
    @Column({ name: 'cissdm_customer_cost_center_code', type: 'varchar', length: 50, nullable: true })
    cissdmCustomerCostCenterCode?: string;
  
    @Column({ name: 'system_created_at', type: 'datetime' })
    systemCreatedAt: Date;
  
    @Column({ name: 'last_modified_date_time', type: 'datetime' })
    lastModifiedDateTime: Date;
  
    @Column({ name: 'api_source', type: 'varchar', length: 10 })
    apiSource: string;
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  }