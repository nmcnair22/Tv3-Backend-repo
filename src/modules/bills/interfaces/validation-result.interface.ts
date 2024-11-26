// src/modules/bills/interfaces/validation-result.interface.ts

export interface ValidationResult {
  status: 'Pass' | 'Fail';
  level: number;
  errors?: any;
  updatedData?: any;
  ProcessedData?: any;
  LineItems?: LineItem[];
  ValidationResult?: {
    Level?: string;
    Notes?: string;
    [key: string]: any;
  };
}

export interface LineItem {
  Description: string;
  Amount: number;
  Category?: string;
  SubCategory?: string;
  [key: string]: any;
}
