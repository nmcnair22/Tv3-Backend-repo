import { Test, TestingModule } from '@nestjs/testing';
import { V2ApiService } from './v2-api.service';

describe('V2ApiService', () => {
  let service: V2ApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [V2ApiService],
    }).compile();

    service = module.get<V2ApiService>(V2ApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
