// src/modules/sync/dto/v2-sales-credit-memo-line-data.dto.ts

export interface V2SalesCreditMemoLineData {
    id: string;
    sequence: number;
    itemId?: string | null;
    accountId?: string | null;
    lineType?: string | null;
    lineObjectNumber?: string | null;
    description?: string | null;
    description2?: string | null;
    unitOfMeasureId?: string | null;
    unitOfMeasureCode?: string | null;
    unitPrice: number;
    quantity: number;
    discountAmount: number;
    discountPercent: number;
    discountAppliedBeforeTax: boolean;
    amountExcludingTax: number;
    taxCode?: string | null;
    taxPercent: number;
    totalTaxAmount: number;
    amountIncludingTax: number;
    invoiceDiscountAllocation: number;
    netAmount: number;
    netTaxAmount: number;
    netAmountIncludingTax: number;
    shipmentDate?: string | null;
    itemVariantId?: string | null;
    locationId?: string | null;
  }
  