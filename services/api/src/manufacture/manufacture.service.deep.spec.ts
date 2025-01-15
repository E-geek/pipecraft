import fs from 'node:fs/promises';
import { Repository } from 'typeorm';
import { IBuildingTypeDescriptor, IPiece, IPieceId, IPieceMeta } from '@pipecraft/types';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { ManufactureEntity } from '@/db/entities/ManufactureEntity';
import { PieceEntity } from '@/db/entities/PieceEntity';
import { BuildingEntity } from '@/db/entities/BuildingEntity';
import { PipeEntity } from '@/db/entities/PipeEntity';
import { SchedulerEntity } from '@/db/entities/SchedulerEntity';
import { BuildingRunConfigEntity } from '@/db/entities/BuildingRunConfigEntity';
import { getTestDBConf } from '@/test/db.conf';
import { TestPrinter } from '@/test/TestPrinter';
import { ManufactureService } from '@/manufacture/manufacture.service';

describe('ManufactureService', () => {
  let service :ManufactureService;
  let pieceRepo :Repository<PieceEntity>;
  let testPrinterRepo :Repository<TestPrinter>;
  let manufactureRepo :Repository<ManufactureEntity>;
  let workingDirectory :string | null = null;

  type IPieceMetaLocal = IPieceMeta & { data :number };
  type IPieceLocal = IPiece<IPieceMetaLocal>;

  const getMinerDescriptor = (length = 10) :IBuildingTypeDescriptor<IPieceLocal, IPieceMetaLocal> => ({
    gear: async (args) => {
      const x :IPieceMetaLocal[] = Array.from({ length }, (_, i) => ({ data: i }));
      args.push(x);
      return { okResult: []};
    },
  });
  const getFactoryDescriptor = () :IBuildingTypeDescriptor<IPieceLocal, IPieceMetaLocal> => ({
    gear: async (args ) => {
      const input = args.input;
      for (const { data :piece } of input) {
        args.push([{ data: piece.data * 2 }]);
      }
      return { okResult: input.map(({ pid }) => pid) };
    },
  });
  const getPrinterDescriptor = (result :IPieceMetaLocal[]) :IBuildingTypeDescriptor<IPieceLocal, IPieceMetaLocal> => ({
    gear: async (args) => {
      const input = args.input;
      for (const { data :piece } of input) {
        result.push({ data: piece.data });
        args.push([{ data: piece.data }]);
      }
      return { okResult: input.map(({ pid }) => pid) };
    },
  });

  const rand = (min :number, max :number) => Math.floor(Math.random() * (max - min + 1) + min);

  beforeEach(async () => {
    const module :TestingModule = await Test.createTestingModule({
      providers: [ ManufactureService ],
      imports: [
        TypeOrmModule.forRoot(getTestDBConf()),
        TypeOrmModule.forFeature([
          TestPrinter,
          BuildingEntity,
          PipeEntity,
          SchedulerEntity,
          ManufactureEntity,
          PieceEntity,
          BuildingRunConfigEntity,
        ]),
      ],
    }).compile();

    service = module.get<ManufactureService>(ManufactureService);
    testPrinterRepo = module.get<Repository<TestPrinter>>(getRepositoryToken(TestPrinter));
    manufactureRepo = module.get<Repository<ManufactureEntity>>(getRepositoryToken(ManufactureEntity));
    pieceRepo = module.get<Repository<PieceEntity>>(getRepositoryToken(PieceEntity));
    await manufactureRepo.delete({});
    await testPrinterRepo.delete({});
    await pieceRepo.delete({});
  });

  afterEach(async () => {
    service.clearBuildingTypes();
    if (workingDirectory) {
      await fs.rm(workingDirectory, { recursive: true });
      workingDirectory = null;
    }
  });

  it('check infrastructure of this test', async () => {
    const result = [] as IPieceMetaLocal[];
    service.registerBuildingType('minerTest', getMinerDescriptor(10));
    service.registerBuildingType('factoryTest', getFactoryDescriptor());
    service.registerBuildingType('printerTest', getPrinterDescriptor(result));
    await service.startFromMining(1n, {});
    expect(result).toHaveLength(10);
    expect(result).toMatchObject(Array.from({ length: 10 }, (_, i) => ({ data: i * 2 })));
  });

  it('recycle test', async () => {
    const result = [] as IPieceMetaLocal[];
    const wrong = new Set<IPieceId>();
    const factoryDescriptor :IBuildingTypeDescriptor<IPieceLocal, IPieceMetaLocal> = {
      gear: async (args ) => {
        const input = args.input;
        const okResult :IPieceId[] = [];
        const errorResult :IPieceId[] = [];
        for (const { pid, data :piece } of input) {
          if (pid % 2n === 0n && !wrong.has(pid)) {
            errorResult.push(pid);
            wrong.add(pid);
            continue;
          }
          args.push([{ data: piece.data * 2 }]);
        }
        return { okResult, errorResult };
      },
    };
    service.registerBuildingType('minerTest', getMinerDescriptor(10));
    service.registerBuildingType('factoryTest', factoryDescriptor);
    service.registerBuildingType('printerTest', getPrinterDescriptor(result));
    await service.startFromMining(1n, {});
    expect(result).toHaveLength(10);
    expect(result).toMatchObject(Array.from({ length: 10 }, (_, i) => ({ data: i * 2 })));
    expect(wrong.size).toBe(5);
    expect(wrong).toEqual(new Set([ 2n, 4n, 6n, 8n, 10n ]));
  });
});
