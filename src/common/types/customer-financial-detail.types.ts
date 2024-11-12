// src/common/types/customer-financial-detail.types.ts

export interface CustomerFinancialDetail {
    "@odata.etag": string;
    id: string;
    number: string;
    balance: number;
    totalSalesExcludingTax: number;
    overdueAmount: number;
    lastModifiedDateTime: string;
  }
  
  export interface CustomerFinancialDetailResponse {
    "@odata.context": string;
    "@odata.etag": string;
    id: string;
    number: string;
    displayName: string;
    // ... other customer fields
    customerFinancialDetail: CustomerFinancialDetail;
  }
  