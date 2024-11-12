// src/modules/payments/dto/create-payment-history.dto.ts

import { IsDate, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePaymentHistoryDto {
  @IsString()
  paymentId: string;

  @IsString()
  @IsOptional()
  depositEntryNo?: string;

  @IsNumber()
  paymentAmount: number;

  @IsString()
  paymentType: string; // e.g., 'Check', 'ACH', etc.

  @IsString()
  relatedInvoiceId: string; // Updated from relatedInvoiceNumber to relatedInvoiceId

  @IsString()
  customerNumber: string;

  @IsDate()
  paymentDate: Date; // Changed from string to Date

  @IsString()
  status: string; // e.g., 'On-Time', 'Late', 'Partial'

  @IsOptional()
  daysEarly?: number;

  @IsOptional()
  daysLate?: number;
}
