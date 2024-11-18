// src/modules/sync/dto/v2-purchase-order-data.dto.ts

export interface V2PurchaseOrderData {
    id: string;
    number: string;
    orderDate?: string | null;
    postingDate?: string | null;
    vendorId?: string | null;
    vendorNumber: string;
    vendorName?: string | null;
    payToName?: string | null;
    payToVendorId?: string | null;
    payToVendorNumber?: string | null;
    shipToName?: string | null;
    shipToContact?: string | null;
    buyFromAddressLine1?: string | null;
    buyFromAddressLine2?: string | null;
    buyFromCity?: string | null;
    buyFromState?: string | null;
    buyFromPostCode?: string | null;
    buyFromCountry?: string | null;
    payToAddressLine1?: string | null;
    payToAddressLine2?: string | null;
    payToCity?: string | null;
    payToState?: string | null;
    payToPostCode?: string | null;
    payToCountry?: string | null;
    shipToAddressLine1?: string | null;
    shipToAddressLine2?: string | null;
    shipToCity?: string | null;
    shipToState?: string | null;
    shipToPostCode?: string | null;
    shipToCountry?: string | null;
    shortcutDimension1Code?: string | null;
    shortcutDimension2Code?: string | null;
    currencyId?: string | null;
    currencyCode?: string | null;
    pricesIncludeTax?: boolean | null;
    paymentTermsId?: string | null;
    shipmentMethodId?: string | null;
    purchaser?: string | null;
    requestedReceiptDate?: string | null;
    discountAmount?: number | null;
    discountAppliedBeforeTax?: boolean | null;
    totalAmountExcludingTax?: number | null;
    totalTaxAmount?: number | null;
    totalAmountIncludingTax?: number | null;
    fullyReceived?: boolean | null;
    status?: string | null;
    lastModifiedDateTime?: string | null;
  }
  