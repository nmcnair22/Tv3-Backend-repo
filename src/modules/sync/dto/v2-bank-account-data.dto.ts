// src/modules/sync/dto/v2-bank-account-data.dto.ts

export interface V2BankAccountData {
    id: string;
    number: string;
    displayName: string;
    bankAccountNumber?: string | null;
    blocked?: boolean | null;
    currencyCode?: string | null;
    currencyId?: string | null;
    iban?: string | null;
    intercompanyEnabled?: boolean | null;
    lastModifiedDateTime?: string | null;
  }
  