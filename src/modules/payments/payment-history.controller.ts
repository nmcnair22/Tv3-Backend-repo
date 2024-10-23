import { Controller, Get, HttpException, HttpStatus, Logger, Query } from '@nestjs/common';
import { FinancialDashboardService } from '../financial-dashboard/financial-dashboard.service';

@Controller('payment-history')
export class PaymentHistoryController {
  private readonly logger = new Logger(PaymentHistoryController.name); // Initialize logger

  constructor(private readonly financialDashboardService: FinancialDashboardService) {}

  @Get('customer-payments')
  async getPaymentsByCustomer(
    @Query('customerNumber') customerNumber: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!customerNumber || !startDate || !endDate) {
      throw new HttpException('Missing required query parameters', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.financialDashboardService.getPaymentsByCustomer(startDate, endDate);
    } catch (error) {
    const err = error as any;
      this.logger.error(`Error fetching customer payments: ${err.message}`); // Use logger for error handling
      throw new HttpException('Failed to fetch customer payments', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
