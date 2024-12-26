import { Test, TestingModule } from '@nestjs/testing';
import { ManufactureService } from './manufacture.service';

describe('ManufactureService', () => {
  let service :ManufactureService;

  beforeEach(async () => {
    const module :TestingModule = await Test.createTestingModule({
      providers: [ ManufactureService ],
    }).compile();

    service = module.get<ManufactureService>(ManufactureService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
