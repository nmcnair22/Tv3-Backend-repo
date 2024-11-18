// src/modules/sync/dto/v2-customer-data.dto.ts

export interface V2CustomerData {
    id: number;
    number: string;
    displayName: string;
    type?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    phoneNumber?: string | null;
    email?: string | null;
    website?: string | null;
    salespersonCode?: string | null;
    balanceDue?: number | null;
    creditLimit?: number | null;
    taxLiable?: boolean | null;
    taxAreaId?: number | null;
    taxAreaDisplayName?: string | null;
    taxRegistrationNumber?: string | null;
    currencyId?: number | null;
    currencyCode?: string | null;
    paymentTermsId?: number | null;
    shipmentMethodId?: number | null;
    paymentMethodId?: number | null;
    blocked?: boolean | null;
    lastModifiedDateTime?: string | null;
  }
  