import { Test, TestingModule } from '@nestjs/testing';
import { FinancialDashboardLocalService } from './financial-dashboard-local.service';

describe('FinancialDashboardLocalService', () => {
  let service: FinancialDashboardLocalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FinancialDashboardLocalService],
    }).compile();

    service = module.get<FinancialDashboardLocalService>(FinancialDashboardLocalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
