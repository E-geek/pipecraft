import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { IBuildingTypeDescriptor, IPiece, IPieceMeta } from '@pipecraft/types';
import { BuildingEntity } from '@/db/entities/BuildingEntity';
import { PipeEntity } from '@/db/entities/PipeEntity';
import { SchedulerEntity } from '@/db/entities/SchedulerEntity';
import { ManufactureEntity } from '@/db/entities/ManufactureEntity';
import { PieceEntity } from '@/db/entities/PieceEntity';
import { BuildingRunConfigEntity } from '@/db/entities/BuildingRunConfigEntity';
import { RunReportEntity } from '@/db/entities/RunReportEntity';
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
  let buildingRepo :Repository<BuildingEntity>;
  let pipeRepo :Repository<PipeEntity>;
  let runReportRepo :Repository<RunReportEntity>;

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
          RunReportEntity,
        ]),
      ],
    }).compile();

    testPrinterRepo = module.get<Repository<TestPrinter>>(getRepositoryToken(TestPrinter));
    manufactureRepo = module.get<Repository<ManufactureEntity>>(getRepositoryToken(ManufactureEntity));
    pieceRepo = module.get<Repository<PieceEntity>>(getRepositoryToken(PieceEntity));
    buildingRepo = module.get<Repository<BuildingEntity>>(getRepositoryToken(BuildingEntity));
    pipeRepo = module.get<Repository<PipeEntity>>(getRepositoryToken(PipeEntity));
    runReportRepo = module.get<Repository<RunReportEntity>>(getRepositoryToken(RunReportEntity));
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
      repoManufactures: manufactureRepo,
      repoPieces: pieceRepo,
      repoRunReports: runReportRepo,
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
      repoManufactures: manufactureRepo,
      repoPieces: pieceRepo,
      repoRunReports: runReportRepo,
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
      repoManufactures: manufactureRepo,
      repoPieces: pieceRepo,
      repoRunReports: runReportRepo,
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

  it('test for reports in the db', async () => {
    const building = await buildingRepo.find({
      where: { bid: In([ 1, 2, 3 ]) },
      relations: [ 'runConfig', 'manufacture' ],
      order: {
        bid: 'ASC',
      },
    });
    await buildingRepo.update({
      bid: In([ 1, 2, 3 ]),
    }, {
      batchSize: '100%',
    });
    const pipes = await pipeRepo.findBy({ pmid: In([ 1, 2 ]) });
    const manufactureEntity = new ManufactureEntity({
      title: 'Test manufacture',
      buildings: building,
      pipes,
    });
    await manufactureEntity.save();
    const hub = new Hub({
      repoManufactures: manufactureRepo,
      repoPieces: pieceRepo,
      repoRunReports: runReportRepo,
      buildingTypes: new Map([
        [ 'minerTest', {
          gear(args) {
            args.push([ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ]);
            return {
              okResult: [],
              logs: [{ message: 'Mined 10 pieces', bid: 45n, level: 'DEBUG' }],
            };
          },
        } as IBuildingTypeDescriptor<IPiece, number> ],
        [ 'factoryTest', {
          gear: (args) => {
            args.push(args.input.map(p => p.data + 100));
            return {
              okResult: [ ...args.input.map(p => p.pid) ],
              logs: [{ message: 'Incremented 10 pieces' }],
            };
          },
        } as IBuildingTypeDescriptor<IPiece<number>, number> ],
        [ 'printerTest', {
          gear: ({ bid, input }) => {
            return {
              okResult: input.map(p => p.pid),
              logs: [
                { message: 'Printed 10 pieces', level: 'DEBUG', bid },
                { message: 'Just a test for fail', level: 'ERROR' },
                { message: 'This is fatal error', level: RunReportEntity.LEVEL_FATAL, pids: input.map(p => p.pid) },
                { message: '', level: RunReportEntity.LEVEL_FATAL }, // should be skipped
              ],
            };
          },
        } as IBuildingTypeDescriptor<IPiece<number>, number> ],
      ]),
    });
    await hub.loadAllManufactures();
    const manufacture = hub.allManufactures.get(manufactureEntity.mid)!;
    hub.addBuildingToFacility(manufacture.buildings[0]);
    await hub.waitForFinish(manufactureEntity.mid);
    // check every report
    // miner
    const reportMiner = await runReportRepo.findOne({
      where: { building: { bid: 1n }},
      relations: [ 'buildingRunConfig', 'building' ],
    });
    expect(reportMiner).not.toBeNull();
    expect(reportMiner).toMatchObject({
      level: 1,
      message: 'Mined 10 pieces',
      building: { bid: 1n },
      pids: null,
    } as Partial<RunReportEntity>);
    expect(reportMiner!.buildingRunConfig.brcid).toBe(1n);
    // factory
    const reportFactory = await runReportRepo.findOne({
      where: { buildingRunConfig: { brcid: 2n }},
      relations: [ 'buildingRunConfig', 'building' ],
    });
    expect(reportFactory).not.toBeNull();
    expect(reportFactory).toMatchObject({
      level: 2,
      message: 'Incremented 10 pieces',
      building: { bid: 2n },
      pids: null,
    } as Partial<RunReportEntity>);
    expect(reportFactory!.buildingRunConfig.brcid).toBe(2n);
    // all from printer
    const reportsPrinter = await runReportRepo.find({
      where: { buildingRunConfig: { brcid: 3n }},
      relations: [ 'buildingRunConfig', 'building' ],
    });
    expect(reportsPrinter).toHaveLength(3);
    const debugPrinterReport = reportsPrinter.find(r => r.level === 1);
    expect(debugPrinterReport).not.toBeNull();
    expect(debugPrinterReport).toMatchObject({
      level: 1,
      message: 'Printed 10 pieces',
      building: { bid: 3n },
      pids: null,
    } as Partial<RunReportEntity>);
    const errorPrinterReport = reportsPrinter.find(r => r.level === 8);
    expect(errorPrinterReport).not.toBeNull();
    expect(errorPrinterReport).toMatchObject({
      level: 8,
      message: 'Just a test for fail',
      building: { bid: 3n },
      pids: null,
    } as Partial<RunReportEntity>);
    const fatalPrinterReport = reportsPrinter.find(r => r.level === 16);
    expect(fatalPrinterReport).not.toBeNull();
    expect(fatalPrinterReport).toMatchObject({
      level: 16,
      message: 'This is fatal error',
      building: { bid: 3n },
    } as Partial<RunReportEntity>);
    expect(fatalPrinterReport!.pids).toHaveLength(10);
  });
});
