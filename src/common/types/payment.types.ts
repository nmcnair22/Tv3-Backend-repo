// Payment from Customer Ledger
export interface PaymentCustomerLedger {
  entryNo: number;
  customerName: string;
  amount: number;
  creditAmount: number;
  debitAmount: number;
  description: string;
  documentNo: string;
  documentType: string;
  dueDate: string;
  postingDate: string;
  sourceCode: string;
  transactionNo: string;
  paymentType: 'CustomerLedger';
  documentDate: string;
}

// Invoice details
export interface Invoice {
  entryNo: number;
  closedByEntryNo: number;
  customerName: string;
  customerNo: string;
  debitAmount: number;
  description: string;
  documentDate: string;
  dueDate: string;
  documentNo: string;
  documentType: string;
  prepayment: boolean;
}

export interface DSOMetric {
  invoiceNumber: string;
  customerName: string;
  invoiceDate: string;
  paymentDate: string;
  daysOutstanding: number;
}

export type Payment = PaymentGL | PaymentCustomerLedger;

// Payment from General Ledger
export interface PaymentGL {
  entryNo: number;
  customerName: string;
  amount: number;
  creditAmount: number;
  debitAmount: number;
  description: string;
  documentNo: string;
  documentNumber: string; // Specific to G/L
  documentType: string;
  dueDate: string;
  postingDate: string;
  sourceCode: string;
  transactionNo: string;
  itemNumber?: string;
  totalAmount?: number;
  paymentType: 'GL'; // Discriminator for G/L payment
}

export interface PerCustomerDSOMetric {
  customerName: string;
  averageDSO: number;
}