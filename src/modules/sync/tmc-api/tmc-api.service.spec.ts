import { Test, TestingModule } from '@nestjs/testing';
import { TmcApiService } from './tmc-api.service';

describe('TmcApiService', () => {
  let service: TmcApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TmcApiService],
    }).compile();

    service = module.get<TmcApiService>(TmcApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
