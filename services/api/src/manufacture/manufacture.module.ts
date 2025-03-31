import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManufactureEntity } from '@/db/entities/ManufactureEntity';
import { PieceEntity } from '@/db/entities/PieceEntity';
import { RunReportEntity } from '@/db/entities/RunReportEntity';
import { BuildingEntity } from '@/db/entities/BuildingEntity';
import { BureauModule } from '@/bureau/bureau.module';
import { ManufactureService } from './manufacture.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BuildingEntity,
      ManufactureEntity,
      PieceEntity,
      RunReportEntity,
    ]),
    BureauModule,
  ],
  providers: [ ManufactureService ],
  exports: [ ManufactureService ],
})
export class ManufactureModule {}
