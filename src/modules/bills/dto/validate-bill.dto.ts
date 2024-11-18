// src/modules/bills/dto/validate-bill.dto.ts

import { IsNotEmpty, IsObject } from 'class-validator';

export class ValidateBillDto {
  @IsNotEmpty()
  @IsObject()
  readonly analysisResult: Record<string, unknown>;
}