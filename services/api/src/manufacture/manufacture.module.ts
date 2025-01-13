import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuildingEntity } from '@/db/entities/BuildingEntity';
import { PipeEntity } from '@/db/entities/PipeEntity';
import { ManufactureEntity } from '@/db/entities/ManufactureEntity';
import { BuildingRunConfigEntity } from '@/db/entities/BuildingRunConfigEntity';
import { SchedulerEntity } from '@/db/entities/SchedulerEntity';
import { PieceEntity } from '@/db/entities/PieceEntity';
import { ManufactureService } from './manufacture.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BuildingEntity,
      PipeEntity,
      SchedulerEntity,
      ManufactureEntity,
      PieceEntity,
      BuildingRunConfigEntity,
    ]),
  ],
  providers: [ ManufactureService ],
})
export class ManufactureModule {}
