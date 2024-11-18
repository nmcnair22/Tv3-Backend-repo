// src/modules/sync/dto/v2-vendor-data.dto.ts

export interface V2VendorData {
    id: string; // Assuming ID is a string (e.g., UUID). Adjust if it's a number.
    number: string;
    displayName: string;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    postalCode?: string | null;
    phoneNumber?: string | null;
    email?: string | null;
    website?: string | null;
    taxRegistrationNumber?: string | null;
    currencyCode?: string | null;
    irs1099Code?: string | null;
    paymentTermsCode?: string | null;
    paymentMethodCode?: string | null;
    taxLiable?: boolean | null;
    blocked?: boolean | null;
    balance?: number; // Assuming balance is a number
    lastModifiedDateTime?: string | null;
  }
  