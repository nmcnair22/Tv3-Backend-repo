// src/modules/income-statements/income-statements.module.ts
import { Module } from '@nestjs/common';
import { DynamicsModule } from '../dynamics/dynamics.module';
import { IncomeStatementsController } from './income-statements.controller';
import { IncomeStatementsService } from './income-statements.service';

@Module({
  imports: [DynamicsModule],
  controllers: [IncomeStatementsController],
  providers: [IncomeStatementsService],
})
export class IncomeStatementsModule {}