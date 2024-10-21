// src/common/types/item.types.ts

export interface Item {
    id: string;
    number: string;
    description: string;
    unitPrice: number;
    quantityOnHand: number;
    generalProductPostingGroupCode: string;
    displayName: string;
    // Add other relevant fields based on your API response
  }