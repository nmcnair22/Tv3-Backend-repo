// src/modules/credit/dto/payment-history.dto.ts

export class PaymentRelatedInvoiceDto {
    invoiceNumber: string;
    invoiceDate: Date;
    amount: number;
    dueDate: Date | null;
  }
  
  export class PaymentDataDto {
    paymentDate: Date;
    paymentAmount: number;
    description: string;
    paymentEntryNo: number;
    relatedInvoices: PaymentRelatedInvoiceDto[];
  }
  
  export class UnpaidInvoiceDto {
    invoiceNumber: string;
    invoiceDate: Date;
    dueDate: Date;
    totalAmount: number;
    amountPaid: number;
    amountRemaining: number;
    status: string;
  }
  
  export class PaymentHistoryDto {
    payments: PaymentDataDto[];
    unpaidInvoices: UnpaidInvoiceDto[];
    partiallyPaidInvoices: UnpaidInvoiceDto[];
  }