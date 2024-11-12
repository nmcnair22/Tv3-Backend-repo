// src/modules/credit/dto/get-credit-score.dto.ts

export class CreditScoreFactorsDto {
    totalPurchaseAmount: number;
    PAF: number;
    totalTimelinessPoints: number;
    PTF: number;
    outstandingBalance: number;
    OBF: number;
  }
  
  export class GetCreditScoreDto {
    customerNumber: string;
    creditScore: number;
    creditTier: string;
    spendTier: string;
    averageMonthlySpend: number;
    factors: CreditScoreFactorsDto;
    // Add any other fields as needed
  }