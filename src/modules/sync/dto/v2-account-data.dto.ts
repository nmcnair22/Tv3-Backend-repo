// src/modules/sync/dto/v2-account-data.dto.ts

export interface V2AccountData {
    id: string;
    number: string;
    displayName?: string | null;
    category?: string | null;
    subCategory?: string | null;
    blocked?: boolean | null;
    accountType?: string | null;
    directPosting?: boolean | null;
    netChange?: string | null; // Adjust type if netChange is a number
    consolidationTranslationMethod?: string | null;
    consolidationDebitAccount?: string | null;
    consolidationCreditAccount?: string | null;
    excludeFromConsolidation?: boolean | null;
    lastModifiedDateTime?: string | null;
  }
  