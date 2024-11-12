import { Test, TestingModule } from '@nestjs/testing';
import { DynamicsCustomerService } from './dynamics-customer.service';

describe('DynamicsCustomerService', () => {
  let service: DynamicsCustomerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DynamicsCustomerService],
    }).compile();

    service = module.get<DynamicsCustomerService>(DynamicsCustomerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
