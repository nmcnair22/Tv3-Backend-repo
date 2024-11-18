// src/modules/bills/interfaces/extracted-data.interface.ts

export interface ExtractedData {
    VendorName: string | null;
    VendorAddress: Address | null;
    VendorAddressRecipient: string | null;
    VendorTaxId: string | null;
    CustomerName: string | null;
    CustomerId: string | null;
    CustomerAddress: Address | null;
    CustomerAddressRecipient: string | null;
    CustomerTaxId: string | null;
    BillingAddress: Address | null;
    BillingAddressRecipient: string | null;
    ShippingAddress: Address | null;
    ShippingAddressRecipient: string | null;
    InvoiceId: string | null;
    InvoiceDate: string | null; // ISO String
    DueDate: string | null;     // ISO String
    PurchaseOrder: string | null;
    SubTotal: number | null;
    TotalTax: number | null;
    TotalDiscount: number | null;
    InvoiceTotal: number | null;
    AmountDue: number | null;
    PreviousUnpaidBalance: number | null;
    PaymentTerm: string | null;
    RemittanceAddress: Address | null;
    RemittanceAddressRecipient: string | null;
    ServiceAddress: Address | null;
    ServiceAddressRecipient: string | null;
    ServiceStartDate: string | null; // ISO String
    ServiceEndDate: string | null;   // ISO String
    KVKNumber: string | null;
    PaymentDetails: PaymentDetail[] | null;
    TaxDetails: TaxDetail[] | null;
    PaidInFourInstalments: Instalment[] | null;
    Items: Item[] | null;
  }
  
  export interface Address {
    poBox?: string;
    houseNumber?: string;
    road?: string;
    streetAddress?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    countryRegion?: string;
    house?: string;
  }
  
  export interface PaymentDetail {
    IBAN: string | null;
    SWIFT: string | null;
    BankAccountNumber: string | null;
    BPayBillerCode: string | null;
    BPayReference: string | null;
  }
  
  export interface TaxDetail {
    Amount: number | null;
    Rate: string | null;
  }
  
  export interface Instalment {
    Amount: number | null;
    DueDate: string | null; // ISO String
  }
  
  export interface Item {
    Description: string | null;
    Quantity: number | null;
    UnitPrice: number | null;
    Amount: number | null;
    ProductCode: string | null;
    Date: string | null;      // ISO String
    Tax: number | null;
    TaxRate: string | null;
    Unit: string | null;
    Discount: number | null;
  }
  