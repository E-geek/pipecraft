import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';

import { IBuildingTypeDescriptor, IPiece, IPieceId, IPieceMeta } from '@pipecraft/types';

import { BuildingEntity } from '@/db/entities/BuildingEntity';
import { PipeEntity } from '@/db/entities/PipeEntity';
import { SchedulerEntity } from '@/db/entities/SchedulerEntity';
import { ManufactureEntity } from '@/db/entities/ManufactureEntity';
import { PieceEntity } from '@/db/entities/PieceEntity';
import { BuildingRunConfigEntity } from '@/db/entities/BuildingRunConfigEntity';
import { BuildingTypeEntity } from '@/db/entities/BuildingTypeEntity';
import { UserEntity } from '@/db/entities/UserEntity';
import { Manufacture } from '@/parts/Manufacture/Manufacture';
import { ManufactureService } from './manufacture.service';
import { getTestDBConf } from '@/test/db.conf';
import { TestPrinter } from '@/test/TestPrinter';
import { wait } from '@/parts/async';


describe('ManufactureService', () => {
  let service :ManufactureService;
  let pieceRepo :Repository<PieceEntity>;
  let testPrinterRepo :Repository<TestPrinter>;
  let manufactureRepo :Repository<ManufactureEntity>;
  let workingDirectory :string | null = null;
  let pipeRepo :Repository<PipeEntity>;
  let buildingRepo :Repository<BuildingEntity>;
  let buildingRunConfigRepo :Repository<BuildingRunConfigEntity>;

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
    gear: async (args) => {
      const input = args.input;
      for (const { data: piece } of input) {
        args.push([{ data: piece.data * 2 }]);
      }
      return { okResult: input.map(({ pid }) => pid) };
    },
  });
  const getPrinterDescriptor = (result :IPieceMetaLocal[]) :IBuildingTypeDescriptor<IPieceLocal, IPieceMetaLocal> => ({
    gear: async (args) => {
      const input = args.input;
      for (const { data: piece } of input) {
        result.push({ data: piece.data });
        args.push([{ data: piece.data }]);
      }
      return { okResult: input.map(({ pid }) => pid) };
    },
  });

  const getDummyBuildingType = () :IBuildingTypeDescriptor => ({
    gear: () => Promise.resolve({
      okResult: [],
      errorResult: [],
    }),
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
    pipeRepo = module.get<Repository<PipeEntity>>(getRepositoryToken(PipeEntity));
    buildingRepo = module.get<Repository<BuildingEntity>>(getRepositoryToken(BuildingEntity));
    buildingRunConfigRepo = module.get<Repository<BuildingRunConfigEntity>>(getRepositoryToken(BuildingRunConfigEntity));
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

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(service.startFromMining).toBeDefined();
  });

  it('register and has building type', async () => {
    expect(service.registerBuildingType).toBeDefined();
    expect(service.hasBuildingType).toBeDefined();
    const packageForRegistration = getDummyBuildingType();
    await service.registerBuildingType('test', packageForRegistration);
    const exists = service.hasBuildingType('test');
    expect(exists).toBe(true);
    expect(service.registerBuildingType('test', packageForRegistration)).rejects.toThrow('Building type already exists');
  });

  it('unregister building type', async () => {
    const packageForRegistration = getDummyBuildingType();
    await service.registerBuildingType('test', packageForRegistration);
    expect(service.hasBuildingType('test')).toBe(true);
    service.unregisterBuildingType('test');
    expect(service.hasBuildingType('test')).toBe(false);
  });

  it('clear building types', () => {
    expect(service.clearBuildingTypes).toBeDefined();
    const packageForRegistration = getDummyBuildingType();
    service.registerBuildingType('test', packageForRegistration);
    service.registerBuildingType('test2', packageForRegistration);
    expect(service.hasBuildingType('test')).toBe(true);
    expect(service.hasBuildingType('test2')).toBe(true);
    service.clearBuildingTypes();
    expect(service.hasBuildingType('test')).toBe(false);
    expect(service.hasBuildingType('test2')).toBe(false);
  });

  it('build manufacture failure success', async () => {
    expect(service.buildManufacture).toBeDefined();
    const manufacture = await service.buildManufacture(1n) as Error;
    expect(manufacture).toBeInstanceOf(Error);
    expect(manufacture.message).toBe('Descriptor for minerTest does not exist');
  });

  it('build manufacture', async () => {
    expect(service.buildManufacture).toBeDefined();
    service.registerBuildingType('minerTest', getDummyBuildingType());
    service.registerBuildingType('factoryTest', getDummyBuildingType());
    service.registerBuildingType('printerTest', getDummyBuildingType());
    const manufacture = await service.buildManufacture(1n) as Manufacture;
    expect(manufacture).toBeInstanceOf(Manufacture);
    const buildings = manufacture.buildings;
    expect(buildings).toBeDefined();
    expect(buildings).toHaveLength(3);
    const pipes = manufacture.pipes;
    expect(pipes).toBeDefined();
    expect(pipes).toHaveLength(2);
    const mid = await service.storeManufacture(manufacture);
    const stored = await manufactureRepo.findOne({ where: { mid }});
    expect(stored).toBeDefined();
    // length of building should be 3
    expect(stored!.buildings).toHaveLength(3);
    // length of pipes should be 2
    expect(stored!.pipes).toHaveLength(2);
  });

  it('simple run manufacture', async () => {
    const result = [] as IPieceMetaLocal[];
    service.registerBuildingType('minerTest', getMinerDescriptor(10));
    service.registerBuildingType('factoryTest', getFactoryDescriptor());
    service.registerBuildingType('printerTest', getPrinterDescriptor(result));
    await service.startFromMining(1n, {});
    expect(result).toHaveLength(10);
    expect(result).toMatchObject(Array.from({ length: 10 }, (_, i) => ({ data: i * 2 })));
  });

  it('simple run manufacture and steps pass', async () => {
    type IPieceMetaLocal = IPieceMeta & { data :number };
    type IPieceLocal = IPiece<IPieceMetaLocal>;
    let processed = 0;
    const result :IPieceMetaLocal[] = [];
    const minerDescriptor :IBuildingTypeDescriptor<IPieceLocal, IPieceMetaLocal> = {
      gear: async (args) => {
        args.push([{ data: 1 }]);
        await wait(0);
        processed |= 0x1;
        return { okResult: []};
      },
    };
    const factoryDescriptor :IBuildingTypeDescriptor<IPieceLocal, IPieceMetaLocal> = {
      gear: async (args) => {
        const input = args.input;
        for (const { data: piece } of input) {
          args.push([{ data: piece.data + 1 }]);
        }
        await wait(0);
        processed |= 0x2;
        return { okResult: []};
      },
    };
    const printerDescriptor :IBuildingTypeDescriptor<IPieceLocal, IPieceMetaLocal> = {
      gear: async (args) => {
        const input = args.input;
        for (const { data: piece } of input) {
          result.push({ data: piece.data + 1 });
          args.push([{ data: piece.data + 1 }]);
        }
        await wait(0);
        processed |= 0x4;
        return { okResult: []};
      },
    };
    service.registerBuildingType('minerTest', minerDescriptor);
    service.registerBuildingType('factoryTest', factoryDescriptor);
    service.registerBuildingType('printerTest', printerDescriptor);
    const manufacture = await service.buildManufacture(1n) as Manufacture;
    expect(manufacture).toBeInstanceOf(Manufacture);
    await manufacture.mining();
    expect(processed).toBe(0x1);
    await manufacture.tick();
    expect(processed).toBe(0x3);
    await manufacture.tick();
    expect(processed).toBe(0x7);
    expect(result).toHaveLength(1);
    expect(result).toMatchObject([{ data: 3 }]);
  });

  it('check full pipe', async () => {
    // 1. Generate 10 JSONs into `tmpdir` and store via NN.json Format: {num: RandomNumber, str: RandomNumber + 's'}
    // 2. Run manufacture and pass test miner
    // 3. Await for finish
    // 4. check for memory of the printer for: column numbers should store num * 2, column strings should store 'p' + str,
    const appTmpDir = await fs.mkdtemp(path.join(tmpdir(), 'test-'));
    workingDirectory = appTmpDir;
    const files = [];

    interface IExampleData {
      num :number;
      str :string;
    }

    const records :IExampleData[] = [];
    for (let i = 0; i < 10; i++) {
      const file = `${i.toString().padStart(2, '0')}.json`;
      files.push(file);
      const row = { num: rand(100000, 999999), str: rand(1000, 9999) + 's' };
      records.push(row);
      await fs.writeFile(path.join(appTmpDir, file), JSON.stringify(row));
    }
    // preparing complete, create gears
    type IPieceMetaLocal = IPieceMeta & IExampleData;
    type IPieceLocal = IPiece<IPieceMetaLocal>;
    const minerDescriptor :IBuildingTypeDescriptor<IPieceLocal, IPieceMetaLocal> = {
      gear: async (args) => {
        const tmpDirPath = (args.runConfig as { path :string }).path;
        let files = await fs.readdir(tmpDirPath);
        files = files.sort();
        for (const file of files) {
          const data = await fs.readFile(path.join(tmpDirPath, file), 'utf-8');
          const row = JSON.parse(data) as IPieceMetaLocal;
          args.push([ row ]);
        }
        return { okResult: []};
      },
    };
    const factoryDescriptor :IBuildingTypeDescriptor<IPieceLocal, IPieceMetaLocal> = {
      gear: async (args) => {
        const input = args.input;
        for (const { data: piece } of input) {
          args.push([{
            num: piece.num * 2,
            str: 'p' + piece.str,
          }]);
        }
        await wait(0);
        return { okResult: input.map(p => p.pid) };
      },
    };
    const printerDescriptor :IBuildingTypeDescriptor<IPieceLocal, IPieceMetaLocal> = {
      gear: async (args) => {
        const input = args.input;
        const awaiter :Promise<unknown>[] = [];
        for (const { data: piece } of input) {
          awaiter.push(testPrinterRepo.save({
            number: piece.num,
            string: piece.str,
            bid: args.bid,
          }));
        }
        await Promise.allSettled(awaiter);
        return { okResult: input.map(p => p.pid) };
      },
    };
    service.registerBuildingType('minerTest', minerDescriptor);
    service.registerBuildingType('factoryTest', factoryDescriptor);
    service.registerBuildingType('printerTest', printerDescriptor);
    await service.startFromMining(1n, { runConfig: { path: appTmpDir }});
    const printer = await testPrinterRepo.find({ order: { mid: 'ASC' }});
    expect(printer).toHaveLength(10);
    for (let i = 0; i < 10; i++) {
      expect(printer[i].number).toBe(records[i].num * 2);
      expect(printer[i].string).toBe('p' + records[i].str);
    }
  });

  it('recycle test', async () => {
    const result = [] as IPieceMetaLocal[];
    const wrong = new Set<IPieceId>();
    const factoryDescriptor :IBuildingTypeDescriptor<IPieceLocal, IPieceMetaLocal> = {
      gear: async (args) => {
        const input = args.input;
        const okResult :IPieceId[] = [];
        const errorResult :IPieceId[] = [];
        for (const { pid, data: piece } of input) {
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
  });

  it('test on max attempts', async () => {
    const result = [] as IPieceMetaLocal[];
    // map<id, attempts>
    const wrong = new Map<number, number>();
    const factoryDescriptor :IBuildingTypeDescriptor<IPieceLocal, IPieceMetaLocal> = {
      gear: async (args) => {
        const input = args.input;
        const okResult :IPieceId[] = [];
        const errorResult :IPieceId[] = [];
        for (const { pid, data: piece } of input) {
          const { data } = piece;
          if (data % 2 === 0) {
            errorResult.push(pid);
            wrong.set(data, (wrong.get(data) ?? 0) + 1);
            continue;
          }
          args.push([{ data: data * 2 }]);
        }
        return { okResult, errorResult };
      },
    };
    service.registerBuildingType('minerTest', getMinerDescriptor(10));
    service.registerBuildingType('factoryTest', factoryDescriptor);
    service.registerBuildingType('printerTest', getPrinterDescriptor(result));
    await service.startFromMining(1n, {});
    expect(result).toHaveLength(5);
    expect(result).toMatchObject(Array.from({ length: 5 }, (_, i) => ({ data: 2 * (i * 2 + 1) })));
    expect(wrong.size).toBe(5);
    for (const [ data, attempts ] of wrong) {
      expect(data % 2).toBe(0);
      expect(attempts).toBe(5);
    }
  });

  it('2 miners, 2 factories, 2 printers, 8 pipes, 1 manufacture', async () => {
    const owner = await UserEntity.findOneByOrFail({});
    const minerType = await BuildingTypeEntity.findOneOrFail({ where: { moduleId: 'minerTest' }});
    const factoryType = await BuildingTypeEntity.findOneOrFail({ where: { moduleId: 'factoryTest' }});
    const printerType = await BuildingTypeEntity.findOneOrFail({ where: { moduleId: 'printerTest' }});
    const printerTypeBottom = new BuildingTypeEntity({
      moduleId: 'printerTestBottom',
      title: 'Printer #2',
      meta: { type: 'printer' },
    });
    await printerTypeBottom.save();
    const buildRunConfig = (building :BuildingEntity) => {
      const runConfig = new BuildingRunConfigEntity();
      runConfig.building = building;
      runConfig.runConfig = {
        isGenerated: true,
      };
      return runConfig;
    };
    const minerTop = new BuildingEntity({
      type: minerType,
      meta: { description: 'top miner', isPrimary: true },
      owner,
    });
    const minerBottom = new BuildingEntity({
      type: minerType,
      meta: { description: 'bottom miner', isEven: true },
      owner,
    });
    const factoryTop = new BuildingEntity({
      type: factoryType,
      batchSize: '4',
      meta: { description: 'top factory', action: '+' },
      owner,
    });
    const factoryBottom = new BuildingEntity({
      type: factoryType,
      batchSize: '3',
      meta: { description: 'bottom factory', action: '*' },
      owner,
    });
    const printerTop = new BuildingEntity({
      type: printerType,
      batchSize: '1',
      meta: { description: 'top printer' },
      owner,
    });
    const printerBottom = new BuildingEntity({
      type: printerTypeBottom,
      batchSize: '10',
      meta: { description: 'bottom printer' },
      owner,
    });
    const buildings = [
      minerTop,
      minerBottom,
      factoryTop,
      factoryBottom,
      printerTop,
      printerBottom,
    ];
    await buildingRepo.save(buildings);
    await buildingRunConfigRepo.save(buildings.map(buildRunConfig));
    const pipes = [] as PipeEntity[];
    for (const miner of [ minerTop, minerBottom ]) {
      for (const factory of [ factoryTop, factoryBottom ]) {
        const pipe = new PipeEntity();
        pipe.from = miner;
        pipe.to = factory;
        pipes.push(pipe);
      }
    }
    for (const factory of [ factoryTop, factoryBottom ]) {
      for (const printer of [ printerTop, printerBottom ]) {
        const pipe = new PipeEntity();
        pipe.from = factory;
        pipe.to = printer;
        pipes.push(pipe);
      }
    }
    const manufacture = new ManufactureEntity({
      title: 'Cross-pipe manufacture',
      owner,
      buildings,
      pipes,
    });
    await pipeRepo.save(pipes);
    await manufacture.save();
    const minerDescriptor :IBuildingTypeDescriptor<IPieceLocal, IPieceMetaLocal> = {
      gear: async (args) => {
        if (args.buildingMeta.isPrimary) {
          args.push([ 1, 3, 5, 7, 9, 11, 13, 17, 19, 23 ].map(data => ({ data })));
        }
        if (args.buildingMeta.isEven) {
          args.push([ 2, 4, 6, 8, 10, 12, 14, 16, 18, 20 ].map(data => ({ data })));
        }
        return { okResult: []};
      },
    };
    const factoryDescriptor :IBuildingTypeDescriptor<IPieceLocal, IPieceMetaLocal> = {
      gear: async (args) => {
        const input = args.input;
        const output = [] as IPieceMetaLocal[];
        const action = args.buildingMeta.action;
        for (const { data: piece } of input) {
          if (action === '+') {
            output.push({ data: piece.data + 100 });
          } else if (action === '*') {
            output.push({ data: piece.data * 2 });
          }
        }
        args.push(output);
        return { okResult: input.map(p => p.pid) };
      },
    };
    const resultTopPrinter = [] as IPieceMetaLocal[];
    const resultBottomPrinter = [] as IPieceMetaLocal[];
    service.registerBuildingType('minerTest', minerDescriptor);
    service.registerBuildingType('factoryTest', factoryDescriptor);
    service.registerBuildingType('printerTest', getPrinterDescriptor(resultTopPrinter));
    service.registerBuildingType('printerTestBottom', getPrinterDescriptor(resultBottomPrinter));
    await service.startFromMining(minerTop.bid, {});
    expect(resultTopPrinter).toHaveLength(40);
    expect(resultBottomPrinter).toHaveLength(40);
    expect(resultTopPrinter.map(p => p.data).sort())
      .toMatchObject(resultBottomPrinter.map(p => p.data).sort());
  });
});
