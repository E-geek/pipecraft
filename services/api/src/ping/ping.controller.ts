import { Controller, Get, Query } from '@nestjs/common';

import { PingService } from './ping.service';

@Controller('ping')
export class PingController {
  constructor(private readonly pingService :PingService) {}

  @Get('/')
  ping(@Query('data') data ?:string) {
    return this.pingService.ping(data);
  }
}
