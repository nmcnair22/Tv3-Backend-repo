// src/modules/credit/credit.controller.ts

import {
    Body,
    Controller,
    Get,
    Logger,
    NotFoundException,
    Param,
    Post,
    Query,
} from '@nestjs/common';
import { CreditScoreService } from './credit-score.service';
import { CalculateCreditScoreDto } from './dto/calculate-credit-score.dto';
import { GetCreditScoreHistoryDto } from './dto/get-credit-score-history.dto';
import { GetCreditScoreDto } from './dto/get-credit-score.dto';
import { PaymentHistoryDto } from './dto/payment-history.dto';
import { SpendByCategoryDto } from './dto/spend-by-category.dto';
import { SpendTrendDto } from './dto/spend-trend.dto';

  
  @Controller('customers/:customerNumber/credit')
  export class CreditController {
    private readonly logger = new Logger(CreditController.name);
  
    constructor(private readonly creditScoreService: CreditScoreService) {}
  
    /**
     * Get the current credit score and tier for a customer
     */
    @Get('score')
    async getCreditScore(@Param('customerNumber') customerNumber: string): Promise<GetCreditScoreDto> {
      const creditScoreData = await this.creditScoreService.calculateCreditScore(customerNumber);
      if (!creditScoreData) {
        throw new NotFoundException(`Customer with number ${customerNumber} not found.`);
      }
      return creditScoreData;
    }
  
    /**
     * Get the credit score history for a customer
     */
    @Get('credit-score-history')
    async getCreditScoreHistory(
      @Param('customerNumber') customerNumber: string,
      @Query('startDate') startDate: string,
      @Query('endDate') endDate: string,
      @Query('interval') interval: 'monthly' | 'weekly' | 'daily' = 'monthly',
    ): Promise<GetCreditScoreHistoryDto> {
      const history = await this.creditScoreService.getCreditScoreHistory(
        customerNumber,
        startDate,
        endDate,
        interval,
      );
  
      if (!history || history.length === 0) {
        throw new NotFoundException(`No credit score history found for customer ${customerNumber}.`);
      }
  
      return { history };
    }
  
    /**
     * Manually trigger credit score calculation for a specific customer
     */
    @Post('calculate')
    async calculateCreditScore(
      @Param('customerNumber') customerNumber: string,
      @Body() calculateCreditScoreDto: CalculateCreditScoreDto,
    ): Promise<{ message: string }> {
      try {
        await this.creditScoreService.calculateAndUpdateCreditScoreForCustomer(
          customerNumber,
          calculateCreditScoreDto.asOfDate ? new Date(calculateCreditScoreDto.asOfDate) : undefined,
        );
        this.logger.log(`Credit score calculated for customer ${customerNumber}.`);
        return { message: `Credit score calculated for customer ${customerNumber}.` };
      } catch (error) {
        this.logger.error(
          `Error manually calculating credit score for customer ${customerNumber}`,
          error.stack,
        );
        throw error;
      }
    }
  
    /**
     * Get the spend trend data for a customer
     */
    @Get('spend-trend')
    async getSpendTrend(
      @Param('customerNumber') customerNumber: string,
      @Query('startDate') startDate: string,
      @Query('endDate') endDate: string,
    ): Promise<SpendTrendDto> {
      const trendData = await this.creditScoreService.getSpendTrendData(
        customerNumber,
        startDate,
        endDate,
      );
      return trendData;
    }
  
    /**
     * Get the spend by category for a customer
     */
    @Get('spend-by-category')
    async getSpendByCategory(
      @Param('customerNumber') customerNumber: string,
      @Query('startDate') startDate: string,
      @Query('endDate') endDate: string,
    ): Promise<SpendByCategoryDto> {
      const categoryData = await this.creditScoreService.getSpendByCategory(
        customerNumber,
        startDate,
        endDate,
      );
      return { data: categoryData };
    }
  
    /**
     * Get the payment history for a customer
     */
    @Get('payment-history')
    async getPaymentHistory(
      @Param('customerNumber') customerNumber: string,
      @Query('startDate') startDate?: string,
      @Query('endDate') endDate?: string,
    ): Promise<PaymentHistoryDto> {
      const paymentHistory = await this.creditScoreService.getCustomerPaymentHistory(
        customerNumber,
        startDate,
        endDate,
      );
      return paymentHistory;
    }  

    /**
     * Get credit score factors for a customer
     */
    @Get('credit-score-factors')
    async getCreditScoreFactors(@Param('customerNumber') customerNumber: string): Promise<GetCreditScoreDto> {
      const creditScoreData = await this.creditScoreService.calculateCreditScore(customerNumber);
      if (!creditScoreData) {
        throw new NotFoundException(`Customer with number ${customerNumber} not found.`);
      }
      return creditScoreData;
    }

     /**
   * Get the recent contributing factors affecting the customer's credit score
   */
  @Get('contributing-factors')
  async getContributingFactors(
    @Param('customerNumber') customerNumber: string,
    @Query('limit') limit?: number,
  ): Promise<{ factors: string[] }> {
    const factors = await this.creditScoreService.getContributingFactors(customerNumber, limit);
    return { factors };
  }
}
