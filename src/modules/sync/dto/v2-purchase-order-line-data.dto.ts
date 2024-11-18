// src/modules/sync/dto/v2-purchase-order-line-data.dto.ts

export interface V2PurchaseOrderLineData {
    id: string;
    sequence?: number | null;
    itemId?: string | null;
    accountId?: string | null;
    lineType?: string | null;
    lineObjectNumber?: string | null;
    description?: string | null;
    description2?: string | null;
    unitOfMeasureId?: string | null;
    unitOfMeasureCode?: string | null;
    quantity?: number | null;
    directUnitCost?: number | null;
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
    receivedQuantity?: number | null;
    invoicedQuantity?: number | null;
    invoiceQuantity?: number | null;
    receiveQuantity?: number | null;
    itemVariantId?: string | null;
    locationId?: string | null;
  }
  