import { Module } from '@nestjs/common';
import { ManufactureService } from './manufacture.service';

@Module({
  providers: [ ManufactureService ]
})
export class ManufactureModule {}
