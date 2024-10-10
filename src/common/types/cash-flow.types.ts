// src/types/cash-flow.types.ts

export interface CashFlowItem {
    '@odata.etag': string;
    id: string;
    lineNumber: number;
    display: string;
    netChange: number;
    lineType: string;
    indentation: number;
    dateFilter: string;
    // Add any additional fields as necessary
  }
  
  export interface CashFlowResponse {
    '@odata.context'?: string;
    value: CashFlowItem[];
  }