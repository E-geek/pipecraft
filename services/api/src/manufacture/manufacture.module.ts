import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManufactureService } from './manufacture.service';
import { Building } from '@/db/entities/Building';
import { PipeMemory } from '@/db/entities/PipeMemory';
import { Manufacture } from '@/db/entities/Manufacture';

@Module({
  imports: [
    TypeOrmModule.forFeature([ Building, PipeMemory, Manufacture ]),
  ],
  providers: [ ManufactureService ],
})
export class ManufactureModule {}
