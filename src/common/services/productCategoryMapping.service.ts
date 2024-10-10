// src/services/productCategoryMapping.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { DynamicsService } from '../../modules/dynamics/dynamics.service';

@Injectable()
export class ProductCategoryMappingService {
  private readonly logger = new Logger(ProductCategoryMappingService.name);

  constructor(private readonly dynamicsService: DynamicsService) {}

  async getProductToCategoryMap(): Promise<Record<string, string>> {
    try {
      // Fetch product items from the Dynamics API
      const products = await this.dynamicsService.getItems();
      this.logger.debug('Products fetched:', JSON.stringify(products)); // Log fetched products

      const incomeCategories = await this.getIncomeCategories();
      this.logger.debug('Income categories fetched:', JSON.stringify(incomeCategories)); // Log fetched categories

      // Initialize the product-to-category mapping
      const productToCategoryMap: Record<string, string> = {};

      products.forEach((product) => {
        const postingGroup = product.generalProductPostingGroupCode;
        const matchedCategory = incomeCategories.find((category) =>
          category.matchPostingGroup(postingGroup)
        );

        if (matchedCategory) {
          productToCategoryMap[product.number] = matchedCategory.name;
        } else {
          productToCategoryMap[product.number] = 'Uncategorized Income';
          this.logger.warn(
            `Product ${product.displayName} (${product.number}) is uncategorized.`
          );
        }
      });

      this.logger.debug('Product to Category Mapping:', JSON.stringify(productToCategoryMap)); // Log the mapping

      return productToCategoryMap;
    } catch (error) {
      this.logger.error('Failed to get product-to-category mapping', error);
      throw error;
    }
  }

  async getIncomeCategories() {
    try {
      // Fetch income statements and infer categories from it
      const incomeStatements = await this.dynamicsService.getIncomeStatements();
      this.logger.debug('Income statements fetched:', JSON.stringify(incomeStatements)); // Log the income statements

      // Extract distinct categories based on the income statement data
      return incomeStatements.value.map((statement) => ({
        name: statement.display,
        matchPostingGroup: (group) => group === statement.display,  // Adjust the match logic as necessary
      }));
    } catch (error) {
      this.logger.error('Failed to fetch income categories from income statements', error);
      throw error;
    }
  }
}
