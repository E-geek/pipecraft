import { Test, TestingModule } from '@nestjs/testing';
import { PingController } from './ping.controller';
import { PingService } from './ping.service';

describe('PingController', () => {
  let controller :PingController;

  beforeEach(async () => {
    const module :TestingModule = await Test.createTestingModule({
      controllers: [ PingController ],
      providers: [ PingService ],
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
