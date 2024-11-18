// src/modules/sync/dto/v2-item-data.dto.ts

export interface V2ItemData {
    id: string;
    number: string;
    displayName: string;
    displayName2?: string | null;
    type: string;
    itemCategoryId?: string | null;
    itemCategoryCode?: string | null;
    blocked: boolean;
    gtin?: string | null;
    inventory: number;
    unitPrice: number;
    priceIncludesTax: boolean;
    unitCost: number;
    taxGroupId?: string | null;
    taxGroupCode?: string | null;
    baseUnitOfMeasureId?: string | null;
    baseUnitOfMeasureCode?: string | null;
    generalProductPostingGroupId?: string | null;
    generalProductPostingGroupCode?: string | null;
    inventoryPostingGroupId?: string | null;
    inventoryPostingGroupCode?: string | null;
    lastModifiedDateTime?: string | null;
  }
  