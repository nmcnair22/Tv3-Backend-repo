import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryColumn,
    UpdateDateColumn
} from 'typeorm';

  // Import PaymentTerms and PaymentMethod entities if they are defined
  // import { PaymentTerms } from './payment-terms.entity';
  // import { PaymentMethod } from './payment-method.entity';
  
  @Entity('vendor')
  @Index(['vendorNumber', 'apiSource'], { unique: true })
  export class Vendor {
    /** Primary Key: Vendor ID from the API */
    @PrimaryColumn({ type: 'char', length: 36 })
    id: string;
  
    /** Vendor Number */
    @Column({ name: 'vendor_number', type: 'varchar', length: 20 })
    vendorNumber: string;
  
    /** Display Name */
    @Column({ name: 'display_name', type: 'varchar', length: 100 })
    displayName: string;
  
    /** Address Fields */
    @Column({ name: 'address_line1', type: 'varchar', length: 100, nullable: true })
    addressLine1?: string;
  
    @Column({ name: 'address_line2', type: 'varchar', length: 100, nullable: true })
    addressLine2?: string;
  
    @Column({ type: 'varchar', length: 50, nullable: true })
    city?: string;
  
    @Column({ type: 'varchar', length: 50, nullable: true })
    state?: string;
  
    @Column({ name: 'postal_code', type: 'varchar', length: 20, nullable: true })
    postalCode?: string;
  
    @Column({ type: 'varchar', length: 2, nullable: true })
    country?: string;
  
    /** Contact Information */
    @Column({ name: 'phone_number', type: 'varchar', length: 30, nullable: true })
    phoneNumber?: string;
  
    @Column({ type: 'varchar', length: 80, nullable: true })
    email?: string;
  
    @Column({ type: 'varchar', length: 80, nullable: true })
    website?: string;
  
    /** Tax Registration Number */
    @Column({ name: 'tax_registration_number', type: 'varchar', length: 30, nullable: true })
    taxRegistrationNumber?: string;
  
  
    @Column({ name: 'currency_code', type: 'varchar', length: 10, nullable: true })
    currencyCode?: string;

  
    /** IRS 1099 Code */
    @Column({ name: 'irs_1099_code', type: 'varchar', length: 20, nullable: true })
    irs1099Code?: string;
  
    /** Payment Terms */
    @Column({ name: 'payment_terms_id', type: 'char', length: 36, nullable: true })
    paymentTermsId?: string;
  
    // Uncomment if PaymentTerms entity is defined
    // @ManyToOne(() => PaymentTerms)
    // @JoinColumn({ name: 'payment_terms_id' })
    // paymentTerms?: PaymentTerms;
  
    /** Payment Method */
    @Column({ name: 'payment_method_id', type: 'char', length: 36, nullable: true })
    paymentMethodId?: string;
  
    // Uncomment if PaymentMethod entity is defined
    // @ManyToOne(() => PaymentMethod)
    // @JoinColumn({ name: 'payment_method_id' })
    // paymentMethod?: PaymentMethod;
  
    /** Tax Liable */
    @Column({ name: 'tax_liable', type: 'boolean', nullable: true })
    taxLiable?: boolean;
  
    /** Blocked Status */
    @Column({ type: 'varchar', length: 50, nullable: true })
    blocked?: string;
  
    /** Balance */
    @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
    balance?: number;
  
    /** Last Modified */
    @Column({ name: 'last_modified', type: 'datetime', nullable: true })
    lastModified?: Date;
  
    /** API Source */
    @Column({ name: 'api_source', type: 'varchar', length: 10 })
    apiSource: string;
  
    /** Timestamps */
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  }