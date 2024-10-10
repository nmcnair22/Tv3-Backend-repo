import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { FinancialDashboardController } from './financial-dashboard.controller';
import { FinancialDashboardService } from './financial-dashboard.service';

@Module({
  imports: [CommonModule],
  controllers: [FinancialDashboardController],
  providers: [FinancialDashboardService],
})
export class FinancialDashboardModule {}