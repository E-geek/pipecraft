import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerEntity } from '@/db/entities/SchedulerEntity';
import { ManufactureModule } from '@/manufacture/manufacture.module';
import { IronClockService } from './iron-clock.service';

/**
 * Iron Clock is a module for register and run buildings (I hope miners only) by scheduling
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ SchedulerEntity ]),
    ManufactureModule,
  ],
  providers: [ IronClockService ],
})
export class IronClockModule {}
