// src/modules/sync/dto/v2-purchase-credit-memo-data.dto.ts

export interface V2PurchaseCreditMemoData {
    id: string;
    number: string;
    creditMemoDate?: string | null;
    postingDate?: string | null;
    dueDate?: string | null;
    vendorId?: string | null;
    vendorNumber: string;
    vendorName?: string | null;
    payToVendorId?: string | null;
    payToVendorNumber: string;
    payToName?: string | null;
    buyFromAddressLine1?: string | null;
    buyFromAddressLine2?: string | null;
    buyFromCity?: string | null;
    buyFromCountry?: string | null;
    buyFromState?: string | null;
    buyFromPostCode?: string | null;
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
    paymentTermsId?: string | null;
    shipmentMethodId?: string | null;
    purchaser?: string | null;
    pricesIncludeTax?: boolean | null;
    discountAmount?: number | null;
    discountAppliedBeforeTax?: boolean | null;
    totalAmountExcludingTax?: number | null;
    totalTaxAmount?: number | null;
    totalAmountIncludingTax?: number | null;
    status?: string | null;
    lastModifiedDateTime?: string | null;
    invoiceId?: string | null;
    invoiceNumber?: string | null;
    vendorReturnReasonId?: string | null;
  }
  