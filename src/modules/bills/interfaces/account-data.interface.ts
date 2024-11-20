// src/modules/bills/interfaces/account-data.interface.ts

export interface AccountData {
    multipleLocations: number; // 0 for SLB, 1 for MLB
    accountNumber: string;
    customerName: string;
    locationName: string;
    // Add other relevant fields as needed
  }
  