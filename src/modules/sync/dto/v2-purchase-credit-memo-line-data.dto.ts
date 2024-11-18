// src/modules/sync/dto/v2-purchase-credit-memo-line-data.dto.ts

export interface V2PurchaseCreditMemoLineData {
    id: string;
    documentId: string;
    sequence?: number | null;
    itemId?: string | null;
    accountId?: string | null;
    lineType?: string | null;
    lineObjectNumber?: string | null;
    description?: string | null;
    description2?: string | null;
    unitOfMeasureId?: string | null;
    unitOfMeasureCode?: string | null;
    unitCost?: number | null;
    quantity?: number | null;
    discountAmount?: number | null;
    discountPercent?: number | null;
    discountAppliedBeforeTax?: boolean | null;
    amountExcludingTax?: number | null;
    taxCode?: string | null;
    taxPercent?: number | null;
    totalTaxAmount?: number | null;
    amountIncludingTax?: number | null;
    invoiceDiscountAllocation?: number | null;
    netAmount?: number | null;
    netTaxAmount?: number | null;
    netAmountIncludingTax?: number | null;
    expectedReceiptDate?: string | null;
    itemVariantId?: string | null;
    locationId?: string | null;
    apiSource?: string | null;
}
