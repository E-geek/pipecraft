import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerEntity } from '@/db/entities/SchedulerEntity';
import { ManufactureModule } from '@/manufacture/manufacture.module';
import { IronClockService } from './iron-clock.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ SchedulerEntity ]),
    ManufactureModule,
  ],
  providers: [ IronClockService ],
})
export class IronClockModule {}
