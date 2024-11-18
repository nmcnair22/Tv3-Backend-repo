export interface AccountDataRow {
    id: number;
    id_vendor: string;
    id_location: number;
    id_provider: string;
    id_customer: string;
    accountNumber: string;
    expectedAmount: number;
    // ... add other fields as necessary
    multipleLocations: number;
    customerName: string;
    // ... other fields
  }