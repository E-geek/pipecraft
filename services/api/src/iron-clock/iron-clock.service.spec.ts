import { Test, TestingModule } from '@nestjs/testing';
import { IronClockService } from './iron-clock.service';

describe('IronClockService', () => {
  let service :IronClockService;

  beforeEach(async () => {
    const module :TestingModule = await Test.createTestingModule({
      providers: [ IronClockService ],
    }).compile();

    service = module.get<IronClockService>(IronClockService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
