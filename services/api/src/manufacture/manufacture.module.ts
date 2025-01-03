import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManufactureService } from './manufacture.service';
import { Building } from '@/db/entities/Building';
import { PipeMemory } from '@/db/entities/PipeMemory';

@Module({
  imports: [
    TypeOrmModule.forFeature([ Building, PipeMemory ]),
  ],
  providers: [ ManufactureService ],
})
export class ManufactureModule {}
