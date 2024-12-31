import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PingService } from './ping.service';

describe('PingService', () => {
  let service :PingService;

  beforeEach(async () => {
    const module :TestingModule = await Test.createTestingModule({
      providers: [ PingService ],
      imports: [ ConfigModule ],
    }).compile();

    service = module.get<PingService>(PingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('ping should receive pong and data if set', () => {
    expect(service.ping()).toEqual({ pong: true });
    expect(service.ping('data')).toEqual({ pong: true, data: 'data' });
  });
});
