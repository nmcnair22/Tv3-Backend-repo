// src/modules/sync/entities/sales-credit-memo.entity.ts

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
import { SalesCreditMemoLine } from './sales-credit-memo-line.entity';
  
  @Entity('sales_credit_memo')
  @Index(['number', 'apiSource'], { unique: true })
  export class SalesCreditMemo {
    @PrimaryColumn({ type: 'char', length: 36 })
    id: string;
  
    @Column({ name: 'number', type: 'varchar', length: 50 })
    number: string;
  
    @Column({ name: 'external_document_number', type: 'varchar', length: 50, nullable: true })
    externalDocumentNumber?: string;
  
    @Column({ name: 'credit_memo_date', type: 'date' })
    creditMemoDate: Date;
  
    @Column({ name: 'posting_date', type: 'date' })
    postingDate: Date;
  
    @Column({ name: 'due_date', type: 'date' })
    dueDate: Date;
  
    /** Customer Information */
    @Column({ name: 'customer_id', type: 'char', length: 36 })
    customerId: string;
  
    @ManyToOne(() => Customer)
    @JoinColumn({ name: 'customer_id' })
    customer: Customer;
  
    @Column({ name: 'customer_number', type: 'varchar', length: 20 })
    customerNumber: string;
  
    @Column({ name: 'customer_name', type: 'varchar', length: 100 })
    customerName: string;
  
    @Column({ name: 'bill_to_name', type: 'varchar', length: 100, nullable: true })
    billToName?: string;
  
    @Column({ name: 'bill_to_customer_id', type: 'char', length: 36, nullable: true })
    billToCustomerId?: string;
  
    @Column({ name: 'bill_to_customer_number', type: 'varchar', length: 20, nullable: true })
    billToCustomerNumber?: string;
  
    /** Sell-to Address */
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
  
    /** Bill-to Address */
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
  
    @Column({ name: 'currency_code', type: 'varchar', length: 10, nullable: true })
    currencyCode?: string;
  
    @Column({ name: 'payment_terms_id', type: 'char', length: 36, nullable: true })
    paymentTermsId?: string;
  
    @Column({ name: 'shipment_method_id', type: 'char', length: 36, nullable: true })
    shipmentMethodId?: string;
  
    @Column({ name: 'salesperson', type: 'varchar', length: 50, nullable: true })
    salesperson?: string;
  
    @Column({ name: 'prices_include_tax', type: 'boolean' })
    pricesIncludeTax: boolean;
  
    @Column({ name: 'discount_amount', type: 'decimal', precision: 18, scale: 4 })
    discountAmount: number;
  
    @Column({ name: 'discount_applied_before_tax', type: 'boolean' })
    discountAppliedBeforeTax: boolean;
  
    @Column({ name: 'total_amount_excluding_tax', type: 'decimal', precision: 18, scale: 4 })
    totalAmountExcludingTax: number;
  
    @Column({ name: 'total_tax_amount', type: 'decimal', precision: 18, scale: 4 })
    totalTaxAmount: number;
  
    @Column({ name: 'total_amount_including_tax', type: 'decimal', precision: 18, scale: 4 })
    totalAmountIncludingTax: number;
  
    @Column({ name: 'status', type: 'varchar', length: 50 })
    status: string;
  
    @Column({ name: 'last_modified', type: 'datetime' })
    lastModified: Date;
  
    @Column({ name: 'invoice_id', type: 'char', length: 36, nullable: true })
    invoiceId?: string;
  
    @Column({ name: 'invoice_number', type: 'varchar', length: 50, nullable: true })
    invoiceNumber?: string;
  
    @Column({ name: 'phone_number', type: 'varchar', length: 30, nullable: true })
    phoneNumber?: string;
  
    @Column({ name: 'email', type: 'varchar', length: 80, nullable: true })
    email?: string;
  
    @Column({ name: 'customer_return_reason_id', type: 'char', length: 36, nullable: true })
    customerReturnReasonId?: string;
  
    @Column({ name: 'api_source', type: 'varchar', length: 10 })
    apiSource: string;
  
    /** One-to-Many relationship with SalesCreditMemoLine */
    @OneToMany(() => SalesCreditMemoLine, (line) => line.salesCreditMemo)
    salesCreditMemoLines: SalesCreditMemoLine[];
  
    /** Timestamps */
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  }