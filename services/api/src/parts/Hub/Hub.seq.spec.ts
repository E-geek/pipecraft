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
import { wait } from '@/parts/async';

describe('Hub.seq', () => {
  let pieceRepo :Repository<PieceEntity>;
  let testPrinterRepo :Repository<TestPrinter>;
  let manufactureRepo :Repository<ManufactureEntity>;

  type IPieceMetaLocal = IPieceMeta & { data :number };
  type IPieceLocal = IPiece<IPieceMetaLocal>;

  class PerfParallelCounter {
    private _spent = 0n;
    private _lastChange = 0n;
    private _tasks :bigint[] = [];
    private _stack = 0;
    private _max = 0;

    constructor (private _w = false) {
    }

    start() :number {
      const id = this._tasks.length;
      const now = process.hrtime.bigint();
      this._tasks[id] = now;
      this._stack++;
      if (this._stack > this._max) {
        this._max = this._stack;
      }
      if (this._stack === 1) {
        this._lastChange = now;
      }
      return id;
    }

    stop(id :number) {
      const now = process.hrtime.bigint();
      this._tasks[id] = now - this._tasks[id]; // spent time per task
      this._stack--;
      if (this._stack === 0) {
        this._spent += now - this._lastChange;
      }
    }

    isComplete() {
      return this._stack === 0;
    }

    getReport() {
      const max = this._max;
      let sum = 0n;
      for (const task of this._tasks) {
        sum += task;
      }
      const avg = Number(sum) / Number(this._spent);
      return { max, avg };
    }
  }

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

    testPrinterRepo = module.get<Repository<TestPrinter>>(getRepositoryToken(TestPrinter));
    manufactureRepo = module.get<Repository<ManufactureEntity>>(getRepositoryToken(ManufactureEntity));
    pieceRepo = module.get<Repository<PieceEntity>>(getRepositoryToken(PieceEntity));
    await manufactureRepo.delete({});
    await testPrinterRepo.delete({});
    await pieceRepo.delete({});
  });

  it('Complex bootstrap test', async () => {
    const manufactureEntity = await MakeManufacture.make([
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
    ], {
      meta: {
        isSequential: false,
      },
    });
    expect(manufactureEntity).toBeInstanceOf(ManufactureEntity);
    expect(manufactureEntity.buildings).toHaveLength(3);
    expect(manufactureEntity.pipes).toHaveLength(2);
    expect(manufactureEntity.buildings[0].manufacture).toBe(manufactureEntity);
    expect(manufactureEntity.buildings[1].manufacture).toBe(manufactureEntity);
    expect(manufactureEntity.buildings[2].manufacture).toBe(manufactureEntity);
    expect(manufactureEntity.pipes[0].manufacture).toBe(manufactureEntity);
    expect(manufactureEntity.pipes[1].manufacture).toBe(manufactureEntity);
    expect(manufactureEntity.title).toContain('Manufacture #');
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
        await wait(10);
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
    const manufacture = hub.allManufactures.get(manufactureEntity.mid)!;
    hub.addBuildingToFacility(manufacture.buildings[0]);
    await hub.waitForFinish(manufactureEntity.mid);
    expect(printerChunks).toHaveLength(3);
    expect(printerChunks[0]).toEqual([ 21, 22, 23, 24 ]);
    expect(printerChunks[1]).toEqual([ 25, 26, 27, 28 ]);
    expect(printerChunks[2]).toEqual([ 29, 30 ]);
  });

  it('Test for sequence manufacture', async () => {
    const manufactureEntity = await MakeManufacture.make([
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
        factory: 'incrementBy',
        batch: '1',
        config: {
          increment: 5,
        },
      },
      {
        printer: 'printAll',
        batch: '100%',
      },
    ], {
      meta: {
        isSequential: true,
      },
    });
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
    const countRunDescriptor :number[] = [];
    const factoryDescriptor :IBuildingTypeDescriptor<IPieceLocal, IPieceMetaLocal> = {
      gear: async (args) => {
        const input = args.input;
        const output = [] as IPieceMetaLocal[];
        const increment = (args.runConfig?.increment as null | number) ?? 0;
        countRunDescriptor.push(increment);
        for (const { data: piece } of input) {
          output.push({ data: piece.data + increment });
        }
        args.push(output);
        await wait(10);
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
    const manufacture = hub.allManufactures.get(manufactureEntity.mid)!;
    hub.addBuildingToFacility(manufacture.buildings[0]);
    await hub.waitForFinish(manufactureEntity.mid);
    expect(printerChunks).toHaveLength(1);
    expect(countRunDescriptor).toMatchObject([ 11, 11, 11, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5 ]);
    expect(printerChunks[0]).toEqual([ 26, 27, 28, 29, 30, 31, 32, 33, 34, 35 ]);
  });

  it('2 manufacture, parallel mining, exclusive factories, parallel printing', async () => {
    const manufactureEntity1 = await MakeManufacture.make([
      {
        miner: 'numberMiner',
        config: {
          startFrom: 13,
          mineByRound: 10,
        },
      },
      {
        factory: 'incrementBy',
        batch: 'r4',
        meta: {
          isExclusive: true,
        },
        config: {
          increment: 7,
        },
      },
      {
        printer: 'printAll',
        batch: '1',
      },
    ], {
      meta: {
        isSequential: false,
      },
    });
    const manufactureEntity2 = await MakeManufacture.make([
      {
        miner: 'numberMiner',
        meta: {
          title: manufactureEntity1.buildings[0]!.type.title,
        },
        config: {
          startFrom: 103,
          mineByRound: 10,
        },
      },
      {
        factory: 'incrementBy',
        batch: '3',
        meta: {
          title: manufactureEntity1.buildings[1]!.type.title,
        },
        config: {
          increment: 5,
        },
      },
      {
        printer: 'printAll',
        batch: '1',
        meta: {
          title: manufactureEntity1.buildings[2]!.type.title,
        },
      },
    ], {
      meta: {
        isSequential: false,
      },
    });
    const minerCounter = new PerfParallelCounter();
    const factoryCounter = new PerfParallelCounter(true);
    const printerCounter = new PerfParallelCounter();
    const allCounter = new PerfParallelCounter();
    const minerDescriptor :IBuildingTypeDescriptor<IPieceLocal, IPieceMetaLocal> = {
      gear: async (args) => {
        const mpid = minerCounter.start();
        const bpid = allCounter.start();
        const startFrom :number = (args.runConfig?.startFrom as null | number) ?? 0;
        const mineByRound :number = (args.runConfig?.mineByRound as null | number) ?? 1;
        for (let i = startFrom; i < startFrom + mineByRound; i++) {
          if (i % 5 === 0) {
            await wait(10);
          }
          args.push([{ data: i }] );
        }
        minerCounter.stop(mpid);
        allCounter.stop(bpid);
        return { okResult: []};
      },
    };
    const factoryDescriptor :IBuildingTypeDescriptor<IPieceLocal, IPieceMetaLocal> = {
      gear: async (args) => {
        const fpid = factoryCounter.start();
        const bpid = allCounter.start();
        const input = args.input;
        const output = [] as IPieceMetaLocal[];
        const increment = (args.runConfig?.increment as null | number) ?? 0;
        for (const { data: piece } of input) {
          output.push({ data: piece.data + increment });
        }
        args.push(output);
        await wait(10);
        factoryCounter.stop(fpid);
        allCounter.stop(bpid);
        return { okResult: input.map(p => p.pid) };
      },
    };
    const printerChunks = new Map<bigint, number[]>();
    const printerDescriptor :IBuildingTypeDescriptor<IPieceLocal, IPieceMetaLocal> = {
      gear: async (args) => {
        const ppid = printerCounter.start();
        const bpid = allCounter.start();
        await wait(2);
        const { input, bid } = args;

        const stored = printerChunks.get(bid) ?? [];
        stored.push(...input.map(p => p.data.data));
        printerChunks.set(bid, stored);

        printerCounter.stop(ppid);
        allCounter.stop(bpid);
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
    await hub.loadAllManufactures();
    const manufacture1 = hub.allManufactures.get(manufactureEntity1.mid)!;
    const manufacture2 = hub.allManufactures.get(manufactureEntity2.mid)!;
    hub.addBuildingToFacility(manufacture1.buildings[0]);
    hub.addBuildingToFacility(manufacture2.buildings[0]);
    await Promise.all([
      hub.waitForFinish(manufactureEntity1.mid),
      hub.waitForFinish(manufactureEntity2.mid),
    ]);
    expect(minerCounter.isComplete()).toBe(true);
    expect(factoryCounter.isComplete()).toBe(true);
    expect(printerCounter.isComplete()).toBe(true);
    expect(allCounter.isComplete()).toBe(true);
    expect(printerChunks.size).toBe(2);
    const minerReport = minerCounter.getReport();
    const factoryReport = factoryCounter.getReport();
    const printerReport = printerCounter.getReport();
    const allReport = allCounter.getReport();
    expect(minerReport.max).toBe(2);
    expect(minerReport.avg).toBeGreaterThanOrEqual(1);
    expect(factoryReport.max).toBe(1);
    expect(factoryReport.avg).toBeLessThan(1.05);
    expect(printerReport.max).toBeGreaterThanOrEqual(1);
    expect(allReport.max).toBeGreaterThanOrEqual(2);
  });
});
