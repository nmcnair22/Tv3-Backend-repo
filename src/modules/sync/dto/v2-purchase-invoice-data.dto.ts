// src/modules/sync/dto/v2-purchase-invoice-data.dto.ts

export interface V2PurchaseInvoiceData {
    id: string;
    number: string;
    postingDate?: string | null;
    invoiceDate?: string | null;
    dueDate?: string | null;
    vendorInvoiceNumber?: string | null;
    vendorId?: string | null;
    vendorNumber: string;
    vendorName?: string | null;
    payToName?: string | null;
    payToVendorId?: string | null;
    payToVendorNumber: string;
    shipToName?: string | null;
    shipToContact?: string | null;
    buyFromAddressLine1?: string | null;
    buyFromAddressLine2?: string | null;
    buyFromCity?: string | null;
    buyFromCountry?: string | null;
    buyFromState?: string | null;
    buyFromPostCode?: string | null;
    shipToAddressLine1?: string | null;
    shipToAddressLine2?: string | null;
    shipToCity?: string | null;
    shipToCountry?: string | null;
    shipToState?: string | null;
    shipToPostCode?: string | null;
    payToAddressLine1?: string | null;
    payToAddressLine2?: string | null;
    payToCity?: string | null;
    payToCountry?: string | null;
    payToState?: string | null;
    payToPostCode?: string | null;
    shortcutDimension1Code?: string | null;
    shortcutDimension2Code?: string | null;
    currencyId?: string | null;
    currencyCode?: string | null;
    orderId?: string | null;
    orderNumber?: string | null;
    purchaser?: string | null;
    pricesIncludeTax?: boolean | null;
    discountAmount?: number | null;
    discountAppliedBeforeTax?: boolean | null;
    totalAmountExcludingTax?: number | null;
    totalTaxAmount?: number | null;
    totalAmountIncludingTax?: number | null;
    fullyReceived?: boolean | null;
    status?: string | null;
    lastModifiedDateTime?: string | null;
  }
  