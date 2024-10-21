// src/common/types/invoice.types.ts

export interface Invoice {
    id: string;
    number: string;
    totalAmountIncludingTax: number;
    totalAmountExcludingTax: number;
    totalTaxAmount: number;
    itemNumber: number;
    description: string;
    customerName: string;
    invoiceDate: string;
  }
  
  export interface InvoiceLine {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    lineAmount: number;
  }
  
  export interface GLAccount {
    documentNumber: string;
    accountNumber: string;
  }
  