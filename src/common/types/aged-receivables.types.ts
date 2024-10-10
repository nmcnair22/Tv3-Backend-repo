// src/common/types/aged-receivables.types.ts

export interface AgedReceivableItem {
    '@odata.etag': string;
    customerId: string;
    customerNumber: string;
    name: string;
    currencyCode: string;
    balanceDue: number;
    currentAmount: number;
    period1Label: string;
    period1Amount: number;
    period2Label: string;
    period2Amount: number;
    period3Label: string;
    period3Amount: number;
    agedAsOfDate: string;
    periodLengthFilter: string;
  }
  
  export interface AgedReceivablesResponse {
    '@odata.context'?: string;
    value: AgedReceivableItem[];
  }