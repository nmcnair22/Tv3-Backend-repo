// src/modules/sync/dto/billing-schedule-line-data.dto.ts

export interface BillingScheduleLineData {
  bssiArcbBillingScheduleNumber: string;
  LineNo?: number | null;
  Type_?: string | null;
  ItemNo?: string | null;
  Description?: string | null;
  BillingType?: string | null;
  LocationCode?: string | null;
  UnitMeasureCode?: string | null;
  PricingMethod?: string | null;
  Price?: number | null;
  Qty?: number | null;
  Amount?: number | null;
  BillingFrequency?: string | null;
  BillingStartDate?: string | null;
  BillingEndDate?: string | null;
  Interval?: number | null;  // Updated to match Entity type
  TaxGroupCode?: string | null;
  TaxLiable?: boolean | null;
  TaxAreadCode?: string | null;
  AutoRenewed?: boolean | null;
  UsageOption?: string | null;
  UsageIdentifier?: string | null;
  InitialReading?: number | null;
  RenewalLines?: number | null;
  RevenueSplit?: boolean | null;  // Updated to match Entity type
  ParentAmount?: number | null;
  BssiCalculationMethod?: string | null;
  BssiDayofInvoiceDate?: number | null;
  BssiNumofPeriod?: number | null;
  BssiAlignmentDate?: string | null;
  BssiEstimatedQty?: number | null;
  BssiStatus?: string | null;
  Bssi_UDF_L1?: string | null;
  Bssi_UDF_L2?: string | null;
  Bssi_UDF_L3?: string | null;
  Bssi_UDF_L4?: string | null;
  Bssi_UDF_L5?: string | null;
  Bssi_UDF_L6?: string | null;
  Bssi_UDF_L7?: number | null;  // Assuming correct type based on entity
  Bssi_UDF_L8?: boolean | null;  // Assuming correct type based on entity
  Bssi_UDF_L9?: string | null;
  Bssi_UDF_L10?: string | null;
  Bssi_UDF_L11?: string | null;
  Bssi_UDF_L12?: string | null;
  Bssi_UDF_L13?: string | null;
  Bssi_UDF_L14?: string | null;
  Bssi_UDF_L15?: string | null;
  Bssi_UDF_L16?: string | null;
  Bssi_UDF_L17?: string | null;
  Bssi_UDF_L18?: number | null;  // Assuming correct type based on entity
  Bssi_UDF_L19?: boolean | null;  // Assuming correct type based on entity
  ShortcutDimension1Code?: string | null;
  ShortcutDimension2Code?: string | null;
  BssiShortcutDimension3?: string | null;
  BssiShortcutDimension4?: string | null;
  BssiShortcutDimension5?: string | null;
  BssiShortcutDimension6?: string | null;
  BssiShortcutDimension7?: string | null;
  BssiShortcutDimension8?: string | null;
  BssiAccumulateImport?: boolean | null;
  ShiptoCode?: string | null;
}  