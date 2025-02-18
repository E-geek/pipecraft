import { Test, TestingModule } from '@nestjs/testing';
import { BureauService } from './bureau.service';

describe('BureauService', () => {
  let service: BureauService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BureauService],
    }).compile();

    service = module.get<BureauService>(BureauService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
