// src/modules/credit/dto/calculate-credit-score.dto.ts

import { IsDateString, IsOptional } from 'class-validator';

export class CalculateCreditScoreDto {
  @IsOptional()
  @IsDateString()
  asOfDate?: string;
}