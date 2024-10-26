import { Test, TestingModule } from '@nestjs/testing';
import { FinancialDashboardLocalController } from './financial-dashboard-local.controller';

describe('FinancialDashboardLocalController', () => {
  let controller: FinancialDashboardLocalController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinancialDashboardLocalController],
    }).compile();

    controller = module.get<FinancialDashboardLocalController>(FinancialDashboardLocalController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
