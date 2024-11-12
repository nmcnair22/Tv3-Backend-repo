// src/modules/credit/dto/get-credit-score-history.dto.ts

export class CreditScoreHistoryRecordDto {
    date: string;
    creditScore: number;
  }
  
  export class GetCreditScoreHistoryDto {
    history: CreditScoreHistoryRecordDto[];
  }