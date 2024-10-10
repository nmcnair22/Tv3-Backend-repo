// src/types/income-statements.types.ts

export interface IncomeStatementItem {
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
  
  export interface IncomeStatementsResponse {
    '@odata.context'?: string;
    value: IncomeStatementItem[];
  }