import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Building } from '@/db/entities/Building';
import { PipeMemory } from '@/db/entities/PipeMemory';
import { Manufacture as ManufactureModel } from '@/db/entities/Manufacture';
import { BuildingRunConfig } from '@/db/entities/BuildingRunConfig';
import { Scheduler } from '@/db/entities/Scheduler';
import { Piece } from '@/db/entities/Piece';
import { ManufactureService } from './manufacture.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Building,
      PipeMemory,
      Scheduler,
      ManufactureModel,
      Piece,
      BuildingRunConfig,
    ]),
  ],
  providers: [ ManufactureService ],
})
export class ManufactureModule {}
