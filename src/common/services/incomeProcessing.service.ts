// src/common/services/incomeProcessing.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Payment, PaymentGL } from '../../common/types/payment.types'; // Correct type import for Payment
import { DynamicsInvoiceService } from '../../modules/dynamics/dynamics-invoice.service';
import { DynamicsPaymentService } from '../../modules/dynamics/dynamics-payment.service';
import { ProductCategoryMappingService } from './productCategoryMapping.service';

@Injectable()
export class IncomeProcessingService {
  private readonly logger = new Logger(IncomeProcessingService.name);

  constructor(
    private readonly productCategoryMappingService: ProductCategoryMappingService,
    private readonly dynamicsInvoiceService: DynamicsInvoiceService,
    private readonly dynamicsPaymentService: DynamicsPaymentService,
  ) {}

  /**
   * Processes income data by categorizing based on products and calculates total invoiced and paid amounts
   * within the specified date range.
   * @param startDate - The start date for fetching invoices and payments.
   * @param endDate - The end date for fetching invoices and payments.
   * @returns Categorized income data including total invoiced and paid amounts.
   */
  async processIncome(
    startDate?: string,
    endDate?: string,
  ): Promise<{ [category: string]: { invoiced: number; paid: number } }> {
    const productToCategoryMap = await this.productCategoryMappingService.getProductToCategoryMap();
    this.logger.debug('Product to Category Map:', JSON.stringify(productToCategoryMap)); // Log the map

    // Fetch invoices and payments
    const invoices = await this.dynamicsInvoiceService.getInvoices(startDate, endDate);
    const payments: Payment[] = await this.dynamicsPaymentService.getPayments(startDate, endDate);

    // Log the full response from invoices and payments
    this.logger.debug('Invoices response:', JSON.stringify(invoices));
    this.logger.debug('Payments response:', JSON.stringify(payments));

    // Check if invoices is an array
    if (!Array.isArray(invoices)) {
      this.logger.error('Invoices are not in array format. Cannot process.');
      return {};
    }

    // Initialize categorized data
    const incomeCategories: { [category: string]: { invoiced: number; paid: number } } = {};

    // Categorize invoices
    invoices.forEach((invoice) => {
      // Adjust logic to map based on product mapping if available, or use a fallback
      const category = productToCategoryMap[invoice.customerName] || 'Uncategorized Income';

      // Ensure the category exists in the map
      if (!incomeCategories[category]) {
        incomeCategories[category] = { invoiced: 0, paid: 0 };
      }

      // Increment invoiced amount
      incomeCategories[category].invoiced += invoice.totalAmountIncludingTax || 0;
    });

    // Categorize payments
    payments.forEach((payment) => {
      // Check if payment is of type PaymentGL before accessing itemNumber
      const category =
        (payment as PaymentGL).itemNumber && productToCategoryMap[(payment as PaymentGL).itemNumber] || // Use itemNumber if available for PaymentGL
        productToCategoryMap[payment.description] || // Fallback to description
        productToCategoryMap[payment.customerName] || // Fallback to customer name
        'Uncategorized Income'; // Default fallback

      // Ensure the category exists in the map
      if (!incomeCategories[category]) {
        incomeCategories[category] = { invoiced: 0, paid: 0 };
      }

      // Increment paid amount, use 'totalAmount' only for PaymentGL
      incomeCategories[category].paid += 'totalAmount' in payment ? (payment as PaymentGL).totalAmount || 0 : 0;
    });

    this.logger.debug('Final categorized income:', JSON.stringify(incomeCategories)); // Log the final result

    return incomeCategories;
  }
}
