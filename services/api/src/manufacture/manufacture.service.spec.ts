import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';

import { IBuildingTypeDescriptor, IPiece } from '@pipecraft/types';

import { TestPrinter } from '@/test/TestPrinter';
import { getTestDBConf } from '@/test/db.conf';
import { ManufactureService } from './manufacture.service';
import { Manufacture } from '@/manufacture/Manufacture';
import { Building } from '@/db/entities/Building';
import { PipeMemory } from '@/db/entities/PipeMemory';
import { Scheduler } from '@/db/entities/Scheduler';
import { Manufacture as ManufactureModel } from '@/db/entities/Manufacture';
import { wait } from '@/helpers/async';


describe('ManufactureService', () => {
  let service :ManufactureService;
  let testPrinterRepo :Repository<TestPrinter>;
  let manufactureRepo :Repository<ManufactureModel>;

  const getDummyBuildingType = () :IBuildingTypeDescriptor => ({
    gear: () => Promise.resolve({
      okResult: [],
      errorResult: [],
    }),
  });

  beforeEach(async () => {
    const module :TestingModule = await Test.createTestingModule({
      providers: [ ManufactureService ],
      imports: [
        TypeOrmModule.forRoot(getTestDBConf()),
        TypeOrmModule.forFeature([ TestPrinter, Building, PipeMemory, Scheduler, ManufactureModel ]),
      ]
    }).compile();

    service = module.get<ManufactureService>(ManufactureService);
    testPrinterRepo = module.get<Repository<TestPrinter>>(getRepositoryToken(TestPrinter));
    manufactureRepo = module.get<Repository<ManufactureModel>>(getRepositoryToken(ManufactureModel));
  });

  afterEach(async () => {
    service.clearBuildingTypes();
    await manufactureRepo.delete({});
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
    type IPieceLocal = IPiece & { data :number };
    let processed = 0;
    const result :IPieceLocal[] = [];
    const minerDescriptor :IBuildingTypeDescriptor<IPieceLocal, IPieceLocal> = {
      gear: async (args) => {
        args.push([{ data: 1 }]);
        await wait(0);
        processed |= 0x1;
        return { okResult: []};
      }
    };
    const factoryDescriptor :IBuildingTypeDescriptor<IPieceLocal, IPieceLocal> = {
      gear: async (args ) => {
        const input = args.input;
        for (const piece of input) {
          args.push([{ data: piece.data + 1 }]);
        }
        await wait(0);
        processed |= 0x2;
        return { okResult: []};
      }
    };
    const printerDescriptor :IBuildingTypeDescriptor<IPieceLocal, IPieceLocal> = {
      gear: async (args) => {
        const input = args.input;
        for (const piece of input) {
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
    await manufacture.tick();
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
    const files = [];
    interface IExampleData {
      num :number;
      str :string;
    }
    const records :IExampleData[] = [];
    for (let i = 0; i < 10; i++) {
      const file = `${i.toString().padStart(2, '0')}.json`;
      files.push(file);
      const row = { num: Math.random(), str: Math.random() + 's' };
      records.push(row);
      await fs.writeFile(path.join(appTmpDir, file), JSON.stringify(row));
    }
    await service.startFromMining(1n, { config: { path: appTmpDir }});
    const printer = await testPrinterRepo.find({ order: { mid: 'ASC' }});
    expect(printer).toHaveLength(10);
    for (let i = 0; i < 10; i++) {
      expect(printer[i].number).toBe(records[i].num * 2);
      expect(printer[i].string).toBe('p' + records[i].str);
    }
  });
});
