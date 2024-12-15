import { Injectable } from '@nestjs/common';

@Injectable()
export class PingService {
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
