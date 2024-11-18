// src/modules/sync/dto/customer-payment-history-response.dto.ts

import { IsArray, IsDate, IsNumber, IsOptional, IsString } from 'class-validator';

export class CustomerPaymentHistoryResponse {
  @IsArray()
  payments: Payment[];

  @IsArray()
  unpaidInvoices: UnpaidInvoice[];

  @IsArray()
  partiallyPaidInvoices: PartiallyPaidInvoice[];
}

export class Payment {
  @IsDate()
  paymentDate: Date;

  @IsNumber()
  paymentAmount: number;

  @IsString()
  description: string;

  @IsNumber()
  paymentEntryNo: number;

  @IsArray()
  relatedInvoices: RelatedInvoice[];
}

export class RelatedInvoice {
  @IsString()
  invoiceNumber: string;

  @IsDate()
  invoiceDate: Date;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsDate()
  dueDate?: Date | null;
}

export class UnpaidInvoice {
  @IsString()
  invoiceNumber: string;

  @IsDate()
  invoiceDate: Date;

  @IsDate()
  dueDate: Date;

  @IsNumber()
  totalAmount: number;

  @IsNumber()
  amountPaid: number;

  @IsNumber()
  amountRemaining: number;

  @IsString()
  status: string;
}

export class PartiallyPaidInvoice {
  @IsString()
  invoiceNumber: string;

  @IsDate()
  invoiceDate: Date;

  @IsDate()
  dueDate: Date;

  @IsNumber()
  totalAmount: number;

  @IsNumber()
  amountPaid: number;

  @IsNumber()
  amountRemaining: number;

  @IsString()
  status: string;
}
