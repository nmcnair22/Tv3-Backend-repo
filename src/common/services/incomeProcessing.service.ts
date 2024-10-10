import { Injectable, Logger } from '@nestjs/common';
import { DynamicsService } from '../../modules/dynamics/dynamics.service';
import { ProductCategoryMappingService } from './productCategoryMapping.service';

@Injectable()
export class IncomeProcessingService {
  private readonly logger = new Logger(IncomeProcessingService.name);

  constructor(
    private readonly productCategoryMappingService: ProductCategoryMappingService,
    private readonly dynamicsService: DynamicsService
  ) {}

  async processIncome(startDate?: string, endDate?: string): Promise<any> {
    const productToCategoryMap = await this.productCategoryMappingService.getProductToCategoryMap();
    this.logger.debug('Product to Category Map:', JSON.stringify(productToCategoryMap)); // Log the map

    // Fetch invoices and payments
    const invoices = await this.dynamicsService.getInvoices(startDate, endDate);
    const payments = await this.dynamicsService.getPayments(startDate, endDate);

    // Log the full response from invoices
    this.logger.debug('Invoices response:', JSON.stringify(invoices));

    // Check if invoices is an array
    if (!Array.isArray(invoices)) {
      this.logger.error('Invoices are not in array format. Cannot process.');
      return { error: 'Invoices data is not in array format.' };
    }

    // Log payments response
    this.logger.debug('Payments response:', JSON.stringify(payments));

    // Initialize categorized data
    const incomeCategories = {};

    // Categorize invoices
    invoices.forEach((invoice) => {
      const category = productToCategoryMap[invoice.itemNumber] || 'Uncategorized Income';
      if (!incomeCategories[category]) {
        incomeCategories[category] = { invoiced: 0, paid: 0 };
      }
      incomeCategories[category].invoiced += invoice.totalAmountExcludingTax;
    });

    // Categorize payments
    payments.forEach((payment) => {
      const category = productToCategoryMap[payment.itemNumber] || 'Uncategorized Income';
      if (!incomeCategories[category]) {
        incomeCategories[category] = { invoiced: 0, paid: 0 };
      }
      incomeCategories[category].paid += payment.totalAmount;
    });

    this.logger.debug('Final categorized income:', JSON.stringify(incomeCategories)); // Log the final result
    return incomeCategories;
  }
}
