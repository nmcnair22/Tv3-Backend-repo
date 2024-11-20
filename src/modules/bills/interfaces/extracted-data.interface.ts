// src/modules/bills/interfaces/extracted-data.interface.ts

export interface LineItem {
  Description: string | null;
  Date?: string | null;
  Quantity?: number | null;
  UnitPrice?: number | null;
  Amount: number | null;
  Tax?: number | null;
}

export interface ExtractedData {
  InvoiceId: string | null;
  AmountDue: number | null;
  CustomerAddress: string | null;
  CustomerAddressRecipient?: string | null;
  CustomerId: string | null;
  CustomerName: string | null;
  DueDate: string | null;
  InvoiceDate: string | null;
  InvoiceTotal: number | null;
  PreviousUnpaidBalance?: number | null;
  TotalTax: number | null;
  VendorName: string | null;
  RemittanceAddress?: string | null;
  RemittanceAddressRecipient?: string | null;
  ServiceStartDate?: string | null;
  SubTotal: number | null;
  Items: LineItem[];
}
