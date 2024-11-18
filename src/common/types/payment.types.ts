// Payment from Customer Ledger

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
  dueDate: Date; // Changed to Date for date consistency
  postingDate: Date; // Changed to Date for consistency
  sourceCode: string;
  transactionNo: number;
  paymentType?: string; // Optional for backward compatibility
  depositEntryNo?: string; // Optional for backward compatibility
  createdAt?: Date; // Timestamps for alignment with CustomerLedgerEntry
  updatedAt?: Date; // Timestamps for alignment with CustomerLedgerEntry
}

// Invoice details
export interface Invoice {
  entryNo: number;
  closedByEntryNo: number;
  customerName: string;
  customerNo: string;
  debitAmount: number;
  description: string;
  documentDate: Date; // Changed to Date for consistency
  dueDate: Date; // Changed to Date for consistency
  documentNo: string;
  documentType: string;
  prepayment: boolean;
}

// Days Sales Outstanding Metric
export interface DSOMetric {
  invoiceNumber: string;
  customerName: string;
  invoiceDate: Date; // Changed to Date for consistency
  paymentDate: Date; // Changed to Date for consistency
  daysOutstanding: number;
}

// Payment Types
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
  dueDate: Date; // Changed to Date for consistency
  postingDate: Date; // Changed to Date for consistency
  sourceCode: string;
  transactionNo: string;
  itemNumber?: string; // Optional for specific G/L entries
  totalAmount?: number; // Optional for specific G/L entries
  paymentType: 'GL'; // Discriminator for G/L payment
}

// Per Customer Days Sales Outstanding Metric
export interface PerCustomerDSOMetric {
  customerName: string;
  averageDSO: number;
}

// Payment History Record for Customer Ledger
export interface PaymentHistoryRecord {
  entryNo: number;
  customerName: string;
  amount: number;
  creditAmount: number;
  debitAmount: number;
  documentDate: string;
  documentType: string;
  documentNo: string;
  postingDate: string;
  dueDate: string;
  remainingAmount: number;
  currencyCode: string;
  description: string;
  sourceCode: string;
  transactionNo: string;
  relatedInvoices: {
    invoiceNumber: string;
    invoiceDate: string;
    amount: number;
  }[];
}
