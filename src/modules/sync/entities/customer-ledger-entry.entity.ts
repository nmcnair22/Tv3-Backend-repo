// src/modules/sync/entities/customer-ledger-entry.entity.ts

import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
  
  @Entity('customer_ledger_entry')
  export class CustomerLedgerEntry {
    @PrimaryColumn({ name: 'entry_no', type: 'int' })
    entryNo: number;
  
    @Column({
      name: 'accepted_payment_tolerance',
      type: 'decimal',
      precision: 28,
      scale: 10,
      nullable: true,
    })
    acceptedPaymentTolerance?: number;
  
    @Column({
      name: 'accepted_pmt_disc_tolerance',
      type: 'boolean',
      nullable: true,
    })
    acceptedPmtDiscTolerance?: boolean;
  
    @Column({
      name: 'adjusted_currency_factor',
      type: 'decimal',
      precision: 28,
      scale: 10,
      nullable: true,
    })
    adjustedCurrencyFactor?: number;
  
    @Column({
      name: 'amount',
      type: 'decimal',
      precision: 28,
      scale: 10,
      nullable: true,
    })
    amount?: number;
  
    @Column({
      name: 'amount_lcy',
      type: 'decimal',
      precision: 28,
      scale: 10,
      nullable: true,
    })
    amountLCY?: number;
  
    @Column({
      name: 'amount_to_apply',
      type: 'decimal',
      precision: 28,
      scale: 10,
      nullable: true,
    })
    amountToApply?: number;
  
    @Column({ name: 'applies_to_doc_no', type: 'varchar', length: 20, nullable: true })
    appliesToDocNo?: string;
  
    @Column({
      name: 'applies_to_doc_type',
      type: 'varchar',
      length: 50,
      nullable: true,
    })
    appliesToDocType?: string;
  
    @Column({
      name: 'applies_to_ext_doc_no',
      type: 'varchar',
      length: 35,
      nullable: true,
    })
    appliesToExtDocNo?: string;
  
    @Column({ name: 'applies_to_id', type: 'varchar', length: 50, nullable: true })
    appliesToID?: string;
  
    @Column({ name: 'applying_entry', type: 'boolean', nullable: true })
    applyingEntry?: boolean;
  
    @Column({ name: 'bal_account_no', type: 'varchar', length: 20, nullable: true })
    balAccountNo?: string;
  
    @Column({
      name: 'bal_account_type',
      type: 'varchar',
      length: 50,
      nullable: true,
    })
    balAccountType?: string;
  
    @Column({
      name: 'cfdi_cancellation_reason_code',
      type: 'varchar',
      length: 10,
      nullable: true,
    })
    cfdiCancellationReasonCode?: string;
  
    @Column({ name: 'calculate_interest', type: 'boolean', nullable: true })
    calculateInterest?: boolean;
  
    @Column({
      name: 'certificate_serial_no',
      type: 'varchar',
      length: 250,
      nullable: true,
    })
    certificateSerialNo?: string;
  
    @Column({ name: 'closed_at_date', type: 'date', nullable: true })
    closedAtDate?: Date;
  
    @Column({
      name: 'closed_by_amount',
      type: 'decimal',
      precision: 28,
      scale: 10,
      nullable: true,
    })
    closedByAmount?: number;
  
    @Column({
      name: 'closed_by_amount_lcy',
      type: 'decimal',
      precision: 28,
      scale: 10,
      nullable: true,
    })
    closedByAmountLCY?: number;
  
    @Column({
      name: 'closed_by_currency_amount',
      type: 'decimal',
      precision: 28,
      scale: 10,
      nullable: true,
    })
    closedByCurrencyAmount?: number;
  
    @Column({
      name: 'closed_by_currency_code',
      type: 'varchar',
      length: 10,
      nullable: true,
    })
    closedByCurrencyCode?: string;
  
    @Column({ name: 'closed_by_entry_no', type: 'int', nullable: true })
    closedByEntryNo?: number;
  
    @Column({
      name: 'closing_interest_calculated',
      type: 'boolean',
      nullable: true,
    })
    closingInterestCalculated?: boolean;
  
    @Column({
      name: 'credit_amount',
      type: 'decimal',
      precision: 28,
      scale: 10,
      nullable: true,
    })
    creditAmount?: number;
  
    @Column({ name: 'currency_code', type: 'varchar', length: 10, nullable: true })
    currencyCode?: string;
  
    @Column({ name: 'customer_name', type: 'varchar', length: 100, nullable: true })
    customerName?: string;
  
    @Column({ name: 'customer_no', type: 'varchar', length: 20, nullable: true })
    customerNo?: string;
  
    @Column({
      name: 'customer_posting_group',
      type: 'varchar',
      length: 20,
      nullable: true,
    })
    customerPostingGroup?: string;
  
    @Column({
      name: 'date_time_canceled',
      type: 'varchar',
      length: 50,
      nullable: true,
    })
    dateTimeCanceled?: string;
  
    @Column({
      name: 'date_time_first_req_sent',
      type: 'varchar',
      length: 50,
      nullable: true,
    })
    dateTimeFirstReqSent?: string;
  
    @Column({
      name: 'date_time_sent',
      type: 'varchar',
      length: 50,
      nullable: true,
    })
    dateTimeSent?: string;
  
    @Column({
      name: 'date_time_stamped',
      type: 'varchar',
      length: 50,
      nullable: true,
    })
    dateTimeStamped?: string;
  
    @Column({
      name: 'debit_amount',
      type: 'decimal',
      precision: 28,
      scale: 10,
      nullable: true,
    })
    debitAmount?: number;
  
    @Column({ name: 'description', type: 'varchar', length: 100, nullable: true })
    description?: string;
  
    @Column({ name: 'digital_stamp_pac', type: 'blob', nullable: true })
    digitalStampPAC?: Buffer;
  
    @Column({ name: 'digital_stamp_sat', type: 'blob', nullable: true })
    digitalStampSAT?: Buffer;
  
    @Column({ name: 'dimension_set_id', type: 'int', nullable: true })
    dimensionSetID?: number;
  
    @Column({
      name: 'direct_debit_mandate_id',
      type: 'varchar',
      length: 35,
      nullable: true,
    })
    directDebitMandateID?: string;
  
    @Column({ name: 'document_date', type: 'date', nullable: true })
    documentDate?: Date;
  
    @Column({ name: 'document_no', type: 'varchar', length: 20, nullable: true })
    documentNo?: string;
  
    @Column({
      name: 'document_type',
      type: 'varchar',
      length: 50,
      nullable: true,
    })
    documentType?: string;
  
    @Column({ name: 'due_date', type: 'date', nullable: true })
    dueDate?: Date;
  
    @Column({ name: 'electronic_document_sent', type: 'boolean', nullable: true })
    electronicDocumentSent?: boolean;
  
    @Column({
      name: 'electronic_document_status',
      type: 'varchar',
      length: 50,
      nullable: true,
    })
    electronicDocumentStatus?: string;
  
    @Column({ name: 'error_code', type: 'varchar', length: 10, nullable: true })
    errorCode?: string;
  
    @Column({
      name: 'error_description',
      type: 'varchar',
      length: 250,
      nullable: true,
    })
    errorDescription?: string;
  
    @Column({
      name: 'exported_to_payment_file',
      type: 'boolean',
      nullable: true,
    })
    exportedToPaymentFile?: boolean;
  
    @Column({
      name: 'external_document_no',
      type: 'varchar',
      length: 35,
      nullable: true,
    })
    externalDocumentNo?: string;
  
    @Column({
      name: 'fiscal_invoice_number_pac',
      type: 'varchar',
      length: 50,
      nullable: true,
    })
    fiscalInvoiceNumberPAC?: string;
  
    @Column({
      name: 'global_dimension1_code',
      type: 'varchar',
      length: 20,
      nullable: true,
    })
    globalDimension1Code?: string;
  
    @Column({
      name: 'global_dimension2_code',
      type: 'varchar',
      length: 20,
      nullable: true,
    })
    globalDimension2Code?: string;
  
    // ... Include all other properties following the same pattern
  
    @Column({ name: 'posting_date', type: 'date', nullable: true })
    postingDate?: Date;
  
    @Column({ name: 'remaining_amount', type: 'decimal', precision: 28, scale: 10, nullable: true })
    remainingAmount?: number;
  
    @Column({
      name: 'remaining_amt_lcy',
      type: 'decimal',
      precision: 28,
      scale: 10,
      nullable: true,
    })
    remainingAmtLCY?: number;
  
    @Column({ name: 'system_created_at', type: 'datetime', nullable: true })
    systemCreatedAt?: Date;
  
    @Column({ name: 'last_modified_date_time', type: 'datetime', nullable: true })
    lastModifiedDateTime?: Date;
  
    @Column({ name: 'api_source', type: 'varchar', length: 10, nullable: true })
    apiSource?: string;
  
    /** Timestamps */
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

  }