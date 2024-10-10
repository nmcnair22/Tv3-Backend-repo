// src/modules/cash-flow/cash-flow.module.ts
import { Module } from '@nestjs/common';
import { DynamicsModule } from '../dynamics/dynamics.module';
import { CashFlowController } from './cash-flow.controller';
import { CashFlowService } from './cash-flow.service';

@Module({
  imports: [DynamicsModule],
  controllers: [CashFlowController],
  providers: [CashFlowService],
})
export class CashFlowModule {}