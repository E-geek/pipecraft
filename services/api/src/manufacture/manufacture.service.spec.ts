import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';

import { IBuildingTypeDescriptor, IPiece, IPieceMeta } from '@pipecraft/types';

import { Building } from '@/db/entities/Building';
import { PipeMemory } from '@/db/entities/PipeMemory';
import { Scheduler } from '@/db/entities/Scheduler';
import { Manufacture as ManufactureModel } from '@/db/entities/Manufacture';
import { Piece } from '@/db/entities/Piece';
import { BuildingRunConfig } from '@/db/entities/BuildingRunConfig';
import { Manufacture } from '@/manufacture/Manufacture';
import { ManufactureService } from './manufacture.service';
import { getTestDBConf } from '@/test/db.conf';
import { TestPrinter } from '@/test/TestPrinter';
import { wait } from '@/helpers/async';


describe('ManufactureService', () => {
  let service :ManufactureService;
  let pieceRepo :Repository<Piece>;
  let testPrinterRepo :Repository<TestPrinter>;
  let manufactureRepo :Repository<ManufactureModel>;
  let workingDirectory :string | null = null;

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
          Building,
          PipeMemory,
          Scheduler,
          ManufactureModel,
          Piece,
          BuildingRunConfig,
        ]),
      ]
    }).compile();

    service = module.get<ManufactureService>(ManufactureService);
    testPrinterRepo = module.get<Repository<TestPrinter>>(getRepositoryToken(TestPrinter));
    manufactureRepo = module.get<Repository<ManufactureModel>>(getRepositoryToken(ManufactureModel));
    pieceRepo = module.get<Repository<Piece>>(getRepositoryToken(Piece));
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

  it('build manufacture failure success', async() => {
    expect(service.buildManufacture).toBeDefined();
    const manufacture = await service.buildManufacture(1n) as Error;
    expect(manufacture).toBeInstanceOf(Error);
    expect(manufacture.message).toBe('Descriptor for minerTest does not exist');
  });

  it('build manufacture', async() => {
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

  it('simple run manufacture', async() => {
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
      }
    };
    const factoryDescriptor :IBuildingTypeDescriptor<IPieceLocal, IPieceMetaLocal> = {
      gear: async (args ) => {
        const input = args.input;
        for (const { data :piece } of input) {
          args.push([{ data: piece.data + 1 }]);
        }
        await wait(0);
        processed |= 0x2;
        return { okResult: []};
      }
    };
    const printerDescriptor :IBuildingTypeDescriptor<IPieceLocal, IPieceMetaLocal> = {
      gear: async (args) => {
        const input = args.input;
        for (const { data :piece } of input) {
          result.push({ data: piece.data + 1 });
          args.push([{ data: piece.data + 1 }]);
        }
        await wait(0);
        processed |= 0x4;
        return { okResult: []};
      }
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
        const tmpDirPath = (args.runConfig as {path :string}).path;
        let files = await fs.readdir(tmpDirPath);
        files = files.sort();
        for (const file of files) {
          const data = await fs.readFile(path.join(tmpDirPath, file), 'utf-8');
          const row = JSON.parse(data) as IPieceMetaLocal;
          args.push([ row ]);
        }
        return { okResult: []};
      }
    };
    const factoryDescriptor :IBuildingTypeDescriptor<IPieceLocal, IPieceMetaLocal> = {
      gear: async (args ) => {
        const input = args.input;
        for (const { data :piece } of input) {
          args.push([{
            num: piece.num * 2,
            str: 'p' + piece.str,
          }]);
        }
        await wait(0);
        return { okResult: input.map(p => p.pid) };
      }
    };
    const printerDescriptor :IBuildingTypeDescriptor<IPieceLocal, IPieceMetaLocal> = {
      gear: async (args) => {
        const input = args.input;
        const awaiter :Promise<unknown>[] = [];
        for (const { data :piece } of input) {
          awaiter.push(testPrinterRepo.save({
            number: piece.num,
            string: piece.str,
            bid: args.bid,
          }));
        }
        await Promise.allSettled(awaiter);
        return { okResult: input.map(p => p.pid) };
      }
    };
    service.registerBuildingType('minerTest', minerDescriptor);
    service.registerBuildingType('factoryTest', factoryDescriptor);
    service.registerBuildingType('printerTest', printerDescriptor);
    await service.startFromMining(1n, { runConfig: { path: appTmpDir }});
    const printer = await testPrinterRepo.find({ order: { mid: 'ASC' }});
    expect(printer).toHaveLength(10);
    console.log(records, printer);
    for (let i = 0; i < 10; i++) {
      expect(printer[i].number).toBe(records[i].num * 2);
      expect(printer[i].string).toBe('p' + records[i].str);
    }
  });
});
