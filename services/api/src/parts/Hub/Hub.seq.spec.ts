import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IBuildingTypeDescriptor, IPiece, IPieceMeta } from '@pipecraft/types';
import { BuildingEntity } from '@/db/entities/BuildingEntity';
import { PipeEntity } from '@/db/entities/PipeEntity';
import { SchedulerEntity } from '@/db/entities/SchedulerEntity';
import { ManufactureEntity } from '@/db/entities/ManufactureEntity';
import { PieceEntity } from '@/db/entities/PieceEntity';
import { BuildingRunConfigEntity } from '@/db/entities/BuildingRunConfigEntity';
import { TestPrinter } from '@/test/TestPrinter';
import { getTestDBConf } from '@/test/db.conf';
import { ManufactureService } from '@/manufacture/manufacture.service';
import { Hub } from '@/parts/Hub/Hub';
import { MakeManufacture } from '@/test/MakeManufacture';

describe('Hub', () => {
  let service :ManufactureService;
  let pieceRepo :Repository<PieceEntity>;
  let testPrinterRepo :Repository<TestPrinter>;
  let manufactureRepo :Repository<ManufactureEntity>;
  const workingDirectory :string | null = null;
  let pipeRepo :Repository<PipeEntity>;
  let buildingRepo :Repository<BuildingEntity>;
  let buildingRunConfigRepo :Repository<BuildingRunConfigEntity>;

  type IPieceMetaLocal = IPieceMeta & { data :number };
  type IPieceLocal = IPiece<IPieceMetaLocal>;

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
    pipeRepo = module.get<Repository<PipeEntity>>(getRepositoryToken(PipeEntity));
    buildingRepo = module.get<Repository<BuildingEntity>>(getRepositoryToken(BuildingEntity));
    buildingRunConfigRepo = module.get<Repository<BuildingRunConfigEntity>>(getRepositoryToken(BuildingRunConfigEntity));
    await manufactureRepo.delete({});
    await testPrinterRepo.delete({});
    await pieceRepo.delete({});
  });

  it('Complex bootstrap test', async () => {
    const manufacture = await MakeManufacture.make([
      {
        miner: 'numberMiner',
        config: {
          startFrom: 10,
          mineByRound: 10,
        },
      },
      {
        factory: 'incrementBy',
        batch: '4',
        config: {
          increment: 11,
        },
      },
      {
        printer: 'printAll',
        batch: '100%',
      },
    ]);
    expect(manufacture).toBeInstanceOf(ManufactureEntity);
    expect(manufacture.buildings).toHaveLength(3);
    expect(manufacture.pipes).toHaveLength(2);
    expect(manufacture.buildings[0].manufacture).toBe(manufacture);
    expect(manufacture.buildings[1].manufacture).toBe(manufacture);
    expect(manufacture.buildings[2].manufacture).toBe(manufacture);
    expect(manufacture.pipes[0].manufacture).toBe(manufacture);
    expect(manufacture.pipes[1].manufacture).toBe(manufacture);
    expect(manufacture.title).toContain('Manufacture #');
    const minerDescriptor :IBuildingTypeDescriptor<IPieceLocal, IPieceMetaLocal> = {
      gear: async (args) => {
        const startFrom :number = (args.runConfig?.startFrom as null | number) ?? 0;
        const mineByRound :number = (args.runConfig?.mineByRound as null | number) ?? 1;
        for (let i = startFrom; i < startFrom + mineByRound; i++) {
          args.push([{ data: i }] );
        }
        return { okResult: []};
      },
    };
    const factoryDescriptor :IBuildingTypeDescriptor<IPieceLocal, IPieceMetaLocal> = {
      gear: async (args) => {
        const input = args.input;
        const output = [] as IPieceMetaLocal[];
        const increment = (args.runConfig?.increment as null | number) ?? 0;
        for (const { data: piece } of input) {
          output.push({ data: piece.data + increment });
        }
        args.push(output);
        return { okResult: input.map(p => p.pid) };
      },
    };
    const printerChunks = [] as number[][];
    const printerDescriptor :IBuildingTypeDescriptor<IPieceLocal, IPieceMetaLocal> = {
      gear: async (args) => {
        const input = args.input;
        printerChunks.push(input.map(p => p.data.data));
        return { okResult: input.map(p => p.pid) };
      },
    };
    const hub = new Hub({
      repoManufacture: manufactureRepo,
      repoPieces: pieceRepo,
      buildingTypes: new Map([
        [ 'numberMiner', minerDescriptor ],
        [ 'incrementBy', factoryDescriptor ],
        [ 'printAll', printerDescriptor ],
      ]),
    });
    expect(hub).toBeInstanceOf(Hub);
    await hub.loadAllManufactures();
    hub.runMiner(manufacture.buildings[0]);
    await hub.awaitForLoop('mining');
    await hub.awaitForLoop('main');
    expect(printerChunks).toHaveLength(3);
    expect(printerChunks[0]).toEqual([ 21, 22, 23, 24 ]);
    expect(printerChunks[1]).toEqual([ 25, 26, 27, 28 ]);
    expect(printerChunks[2]).toEqual([ 29, 30 ]);
  });
});
