// src/modules/sync/dto/v2-sales-credit-memo-data.dto.ts

export interface V2SalesCreditMemoData {
    id: string;
    number: string;
    externalDocumentNumber?: string | null;
    creditMemoDate?: string | null;
    postingDate?: string | null;
    dueDate?: string | null;
    customerId?: string | null;
    customerNumber: string;
    customerName?: string | null;
    billToName?: string | null;
    billToCustomerId?: string | null;
    billToCustomerNumber?: string | null;
    sellToAddressLine1?: string | null;
    sellToAddressLine2?: string | null;
    sellToCity?: string | null;
    sellToState?: string | null;
    sellToPostCode?: string | null;
    sellToCountry?: string | null;
    billToAddressLine1?: string | null;
    billToAddressLine2?: string | null;
    billToCity?: string | null;
    billToState?: string | null;
    billToPostCode?: string | null;
    billToCountry?: string | null;
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
    paymentTermsId?: string | null;
    shipmentMethodId?: string | null;
    salesperson?: string | null;
    pricesIncludeTax: boolean;
    discountAmount: number;
    discountAppliedBeforeTax: boolean;
    totalAmountExcludingTax: number;
    totalTaxAmount: number;
    totalAmountIncludingTax: number;
    status?: string | null;
    phoneNumber?: string | null;
    email?: string | null;
    invoiceId?: string | null;
    invoiceNumber?: string | null;
    customerReturnReasonId?: string | null;
  }
  