import { Global, Module } from '@nestjs/common';
import { BureauService, IBureauOptions } from './bureau.service';

/**
 * The module search descriptors by pattern (gears, migrations, types, etc.)
 * and store in the list for run migrations, use tables in the memory block,
 * and mapping descriptor type to descriptor name
 */
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
