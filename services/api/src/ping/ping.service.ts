import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PingService {
  constructor(private configService :ConfigService) {
    console.log('secret:', this.configService.get('appSecret'));
  }

  ping(data ?:string) {
    if (data != null) {
      return {
        pong: true,
        data,
      };
    }
    return {
      pong: true,
    };
  }
}
