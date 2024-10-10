// src/types/balance-sheet.types.ts

export interface BalanceSheetItem {
  '@odata.etag': string;
  id: string;
  lineNumber: number;
  display: string;
  netChange: number;
  lineType: string;
  indentation: number;
  dateFilter: string;
  
  // Added optional properties to handle different API response structures
  balance?: number; 
  amount?: number;  
  

}

export interface BalanceSheetResponse {
  '@odata.context'?: string;
  value: BalanceSheetItem[];
}
