// src/modules/balance-sheet/balance-sheet.module.ts
import { Module } from '@nestjs/common';
import { DynamicsModule } from '../dynamics/dynamics.module';
import { BalanceSheetController } from './balance-sheet.controller';
import { BalanceSheetService } from './balance-sheet.service';

@Module({
  imports: [DynamicsModule],
  controllers: [BalanceSheetController],
  providers: [BalanceSheetService],
})
export class BalanceSheetModule {}