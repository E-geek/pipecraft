import { Global, Module } from '@nestjs/common';
import { BureauService, IBureauOptions } from './bureau.service';

@Global()
@Module({})
export class BureauModule {
  static forRoot(options :IBureauOptions) {
    return {
      module: BureauModule,
      providers: [
        {
          provide: BureauService,
          useValue: new BureauService(options),
        },
      ],
      exports: [ BureauService ],
    };
  }
}
