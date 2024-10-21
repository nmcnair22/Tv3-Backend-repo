// src/modules/sync/entities/sales-invoice.entity.ts

import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Customer } from './customer.entity';
import { SalesInvoiceLine } from './sales-invoice-line.entity';
  // Import PaymentTerms and ShipmentMethod entities if they are defined
  // import { PaymentTerms } from './payment-terms.entity';
  // import { ShipmentMethod } from './shipment-method.entity';
  // import { SalesInvoiceLine } from './sales-invoice-line.entity';
  
  @Entity('sales_invoice')
  @Index(['invoiceNumber', 'apiSource'], { unique: true })
  export class SalesInvoice {
    /** Primary Key: Invoice ID from the API */
    @PrimaryColumn({ type: 'char', length: 36 })
    id: string;
  
    /** Invoice Number */
    @Column({ name: 'invoice_number', type: 'varchar', length: 50 })
    invoiceNumber: string;
  
    /** External Document Number */
    @Column({ name: 'external_document_number', type: 'varchar', length: 50, nullable: true })
    externalDocumentNumber?: string;
  
    /** Invoice Date */
    @Column({ name: 'invoice_date', type: 'date' })
    invoiceDate: Date;
  
    /** Posting Date */
    @Column({ name: 'posting_date', type: 'date' })
    postingDate: Date;
  
    /** Due Date */
    @Column({ name: 'due_date', type: 'date' })
    dueDate: Date;
  
    /** Promised Pay Date */
    @Column({ name: 'promised_pay_date', type: 'date', nullable: true })
    promisedPayDate?: Date;
  
    /** Customer Purchase Order Reference */
    @Column({ name: 'customer_po_reference', type: 'varchar', length: 50, nullable: true })
    customerPurchaseOrderReference?: string;
  
    /** Customer */
    @Column({ name: 'customer_id', type: 'char', length: 36 })
    customerId: string;
  
    @ManyToOne(() => Customer)
    @JoinColumn({ name: 'customer_id' })
    customer: Customer;
  
    @Column({ name: 'customer_number', type: 'varchar', length: 20 })
    customerNumber: string;
  
    @Column({ name: 'customer_name', type: 'varchar', length: 100 })
    customerName: string;
  
    /** Bill-To Information */
    @Column({ name: 'bill_to_name', type: 'varchar', length: 100, nullable: true })
    billToName?: string;
  
    @Column({ name: 'bill_to_customer_id', type: 'char', length: 36, nullable: true })
    billToCustomerId?: string;
  
    @Column({ name: 'bill_to_customer_number', type: 'varchar', length: 20, nullable: true })
    billToCustomerNumber?: string;
  
    /** Ship-To Information */
    @Column({ name: 'ship_to_name', type: 'varchar', length: 100, nullable: true })
    shipToName?: string;
  
    @Column({ name: 'ship_to_contact', type: 'varchar', length: 100, nullable: true })
    shipToContact?: string;
  
    /** Sell-To Address */
    @Column({ name: 'sell_to_address_line1', type: 'varchar', length: 100, nullable: true })
    sellToAddressLine1?: string;
  
    @Column({ name: 'sell_to_address_line2', type: 'varchar', length: 100, nullable: true })
    sellToAddressLine2?: string;
  
    @Column({ name: 'sell_to_city', type: 'varchar', length: 50, nullable: true })
    sellToCity?: string;
  
    @Column({ name: 'sell_to_state', type: 'varchar', length: 50, nullable: true })
    sellToState?: string;
  
    @Column({ name: 'sell_to_post_code', type: 'varchar', length: 20, nullable: true })
    sellToPostCode?: string;
  
    @Column({ name: 'sell_to_country', type: 'varchar', length: 50, nullable: true })
    sellToCountry?: string;
  
    /** Bill-To Address */
    @Column({ name: 'bill_to_address_line1', type: 'varchar', length: 100, nullable: true })
    billToAddressLine1?: string;
  
    @Column({ name: 'bill_to_address_line2', type: 'varchar', length: 100, nullable: true })
    billToAddressLine2?: string;
  
    @Column({ name: 'bill_to_city', type: 'varchar', length: 50, nullable: true })
    billToCity?: string;
  
    @Column({ name: 'bill_to_state', type: 'varchar', length: 50, nullable: true })
    billToState?: string;
  
    @Column({ name: 'bill_to_post_code', type: 'varchar', length: 20, nullable: true })
    billToPostCode?: string;
  
    @Column({ name: 'bill_to_country', type: 'varchar', length: 50, nullable: true })
    billToCountry?: string;
  
    /** Ship-To Address */
    @Column({ name: 'ship_to_address_line1', type: 'varchar', length: 100, nullable: true })
    shipToAddressLine1?: string;
  
    @Column({ name: 'ship_to_address_line2', type: 'varchar', length: 100, nullable: true })
    shipToAddressLine2?: string;
  
    @Column({ name: 'ship_to_city', type: 'varchar', length: 50, nullable: true })
    shipToCity?: string;
  
    @Column({ name: 'ship_to_state', type: 'varchar', length: 50, nullable: true })
    shipToState?: string;
  
    @Column({ name: 'ship_to_post_code', type: 'varchar', length: 20, nullable: true })
    shipToPostCode?: string;
  
    @Column({ name: 'ship_to_country', type: 'varchar', length: 50, nullable: true })
    shipToCountry?: string;
  

    @Column({ name: 'currency_code', type: 'varchar', length: 10, nullable: true })
    currencyCode?: string;
  
    /** Payment Terms */
    @Column({ name: 'payment_terms_id', type: 'char', length: 36, nullable: true })
    paymentTermsId?: string;
  
    // Uncomment if PaymentTerms entity is defined
    // @ManyToOne(() => PaymentTerms)
    // @JoinColumn({ name: 'payment_terms_id' })
    // paymentTerms?: PaymentTerms;
  
    /** Shipment Method */
    @Column({ name: 'shipment_method_id', type: 'char', length: 36, nullable: true })
    shipmentMethodId?: string;
  
    // Uncomment if ShipmentMethod entity is defined
    // @ManyToOne(() => ShipmentMethod)
    // @JoinColumn({ name: 'shipment_method_id' })
    // shipmentMethod?: ShipmentMethod;
  
    /** Salesperson */
    @Column({ type: 'varchar', length: 50, nullable: true })
    salesperson?: string;
  
    /** Prices Include Tax */
    @Column({ name: 'prices_include_tax', type: 'boolean' })
    pricesIncludeTax: boolean;
  
    /** Remaining Amount */
    @Column({ name: 'remaining_amount', type: 'decimal', precision: 18, scale: 2 })
    remainingAmount: number;
  
    /** Discount Amount */
    @Column({ name: 'discount_amount', type: 'decimal', precision: 18, scale: 2 })
    discountAmount: number;
  
    /** Discount Applied Before Tax */
    @Column({ name: 'discount_applied_before_tax', type: 'boolean' })
    discountAppliedBeforeTax: boolean;
  
    /** Total Amount Excluding Tax */
    @Column({ name: 'total_amount_excluding_tax', type: 'decimal', precision: 18, scale: 2 })
    totalAmountExcludingTax: number;
  
    /** Total Tax Amount */
    @Column({ name: 'total_tax_amount', type: 'decimal', precision: 18, scale: 2 })
    totalTaxAmount: number;
  
    /** Total Amount Including Tax */
    @Column({ name: 'total_amount_including_tax', type: 'decimal', precision: 18, scale: 2 })
    totalAmountIncludingTax: number;
  
    /** Status */
    @Column({ type: 'varchar', length: 50 })
    status: string;
  
    /** Last Modified */
    @Column({ name: 'last_modified', type: 'datetime' })
    lastModified: Date;
  
    /** Phone Number */
    @Column({ name: 'phone_number', type: 'varchar', length: 30, nullable: true })
    phoneNumber?: string;
  
    /** Email */
    @Column({ type: 'varchar', length: 80, nullable: true })
    email?: string;
  
    /** API Source */
    @Column({ name: 'api_source', type: 'varchar', length: 10 })
    apiSource: string;
  
    /** Timestamps */
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  
 /** One-to-Many relationship with SalesInvoiceLine */
 @OneToMany(() => SalesInvoiceLine, (line) => line.salesInvoice)
 salesInvoiceLines: SalesInvoiceLine[];
  }