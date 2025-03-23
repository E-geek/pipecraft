import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManufactureEntity } from '@/db/entities/ManufactureEntity';
import { PieceEntity } from '@/db/entities/PieceEntity';
import { RunReportEntity } from '@/db/entities/RunReportEntity';
import { BureauModule } from '@/bureau/bureau.module';
import { ManufactureService } from './manufacture.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
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
