import { Test, TestingModule } from '@nestjs/testing';
import { PingController } from './ping.controller';
import { PingService } from './ping.service';
import { ConfigModule } from '@nestjs/config';

describe('PingController', () => {
  let controller :PingController;

  beforeEach(async () => {
    const module :TestingModule = await Test.createTestingModule({
      controllers: [ PingController ],
      providers: [ PingService ],
      imports: [ ConfigModule ],
    }).compile();

    controller = module.get<PingController>(PingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('ping request should return pong and optional data', () => {
    expect(controller.ping()).toEqual({ pong: true });
    expect(controller.ping('data')).toEqual({ pong: true, data: 'data' });
  });
});
