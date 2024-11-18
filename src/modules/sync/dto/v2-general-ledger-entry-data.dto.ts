// src/modules/sync/dto/v2-general-ledger-entry-data.dto.ts

export interface V2GeneralLedgerEntryData {
    id: string;
    entryNumber?: number | null;
    postingDate?: string | null;
    documentNumber?: string | null;
    documentType?: string | null;
    accountId?: string | null;
    accountNumber?: string | null;
    description?: string | null;
    debitAmount?: number | null;
    creditAmount?: number | null;
    additionalCurrencyDebitAmount?: number | null;
    additionalCurrencyCreditAmount?: number | null;
    lastModifiedDateTime?: string | null;
  }
  