// src/modules/credit/dto/spend-by-category.dto.ts

export class SpendByCategoryItemDto {
    category: string;
    totalAmount: number;
  }
  
  export class SpendByCategoryDto {
    data: SpendByCategoryItemDto[];
  }