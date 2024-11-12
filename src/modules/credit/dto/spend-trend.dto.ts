// src/modules/credit/dto/spend-trend.dto.ts

export class SpendTrendDto {
    [month: string]: number; // e.g., { "2023-01": 5000, "2023-02": 7000, ... }
  }