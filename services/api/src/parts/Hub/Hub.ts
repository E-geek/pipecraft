import { Repository } from 'typeorm';
import { IBuildingTypeDescriptor, Nullable } from '@pipecraft/types';
import { ManufactureEntity } from '@/db/entities/ManufactureEntity';
import { PieceEntity } from '@/db/entities/PieceEntity';
import { BuildingEntity } from '@/db/entities/BuildingEntity';
import { ManufactureMaker } from '@/parts/Manufacture/ManufactureMaker';
import { Manufacture } from '@/parts/Manufacture/Manufacture';
import { Loop } from '@/parts/Hub/Loop';
import { IPromise, promise, wait } from '@/parts/async';
import { IBuilding } from '@/parts/Manufacture/Building';
import { IPipe } from '@/parts/Manufacture/Pipe';
import { Facility, IFacilityPushArgs } from '@/parts/Hub/Facility';
import { IQueueItem, QueueArea } from '@/parts/Hub/QueueArea';

export type ILoopName = 'main' | 'mining';

interface ILoopMapBase {
  // key of object can be only ILoopName
  [key :string] :unknown;
}

interface ILoopMap extends ILoopMapBase {
  main :Manufacture;
  mining :bigint;
}

export interface IHub {
  /**
   * Loading all manufactures to the memory
   * All manufactures after loading is inactive and not in loop
   */
  loadAllManufactures :() =>Promise<IHub | Error>;

  /**
   * check every pipe in every manufacture for possible to process data
   * if even one pipe can process data then manufacture will add to loop
   */
  activateManufacturesOnDemand :() =>Promise<IHub | Error>;

  /**
   * Function for call from custom run and scheduler
   * Inside run only miner and if miner to mine then manufacture will be added to loop
   * @param minerEntity
   */
  runMiner :(minerEntity :BuildingEntity) =>Promise<IHub | Error>;

  /**
   * start processing for all factory, printers and other buildings **except** miners
   */
  startLoop :(target ?:ILoopName) =>IHub;

  /**
   * pause working the loop
   */
  pauseLoop :(target ?:ILoopName) =>IHub;

  /**
   * Wait for loop to be idle (pause or finish)
   * @param target
   */
  awaitForLoop :(target :ILoopName) =>Promise<void>;
}

export interface IHubArgs {
  repoPieces :Repository<PieceEntity>;
  repoManufacture :Repository<ManufactureEntity>;
  buildingTypes :Map<string, IBuildingTypeDescriptor>;
}

export class Hub implements IHub {
  private _queueArea :QueueArea;
  private _facility :Facility;
  private _manufactures :Map<bigint, Manufacture>;
  private _repoManufacture :Repository<ManufactureEntity>;
  private _repoPieces :Repository<PieceEntity>;
  private _buildingTypes :Map<string, IBuildingTypeDescriptor>;
  private _manufactureLoopStatuses :{
    [key in ILoopName] :'run' | 'idle';
  };
  private _manufactureLoops :{
    [key in ILoopName] :Loop<ILoopMap[key]>;
  };
  private _manufactureLoopAwaiter :{
    [key in ILoopName] :Nullable<IPromise<void>>;
  };

  constructor(args :IHubArgs) {
    this._repoManufacture = args.repoManufacture;
    this._repoPieces = args.repoPieces;
    this._buildingTypes = args.buildingTypes;
    // init value
    this._manufactures = new Map();
    this._manufactureLoops = {
      main: new Loop<Manufacture>(),
      mining: new Loop<bigint>(),
    };
    this._manufactureLoopStatuses = {
      main: 'idle',
      mining: 'idle',
    };
    this._manufactureLoopAwaiter = {
      main: null,
      mining: null,
    };
    this._facility = new Facility(32);
    this._queueArea = new QueueArea();
  }

  private _onManufactureReceive = (manufactureEntity :ManufactureEntity) :void => {
    const manufacture = this._manufactures.get(manufactureEntity.mid)!;
    if (!this._manufactureLoops.main.has(manufacture)) {
      this._manufactureLoops.main.add(manufacture);
      if (this._loopShouldBeProcessed('main')) {
        this._loopProcessor('main').then(); // just run and don't await
      }
    }
    return;
  };

  public async loadAllManufactures() {
    const manufactureEntities = await this._repoManufacture.findBy({});
    for (const entity of manufactureEntities) {
      const manufacture = await ManufactureMaker.loadManufacture({
        manufactureModel: entity,
        onReceive: (buildingEntity, pieces) => pieces.map(
          (piece) => new PieceEntity({ from: buildingEntity, data: piece })
        ),
        repoPieces: this._repoPieces,
        buildingTypes: this._buildingTypes,
      });
      if (manufacture instanceof Error) {
        return new Error(`Failed to load manufacture: ${manufacture.message}`);
      }
      this._manufactures.set(entity.mid, manufacture);
    }
    return this;
  }

  public async awaitForLoop(target :ILoopName) {
    if (this._manufactureLoopStatuses[target] === 'idle' || this._manufactureLoopAwaiter[target] == null) {
      return;
    }
    return this._manufactureLoopAwaiter[target].promise;
  }

  public async activateManufacturesOnDemand() {
    return this;
  }

  public async runMiner(minerEntity :BuildingEntity) {
    const minerId = minerEntity.bid;
    if (this._manufactureLoops.mining.has(minerId)) {
      // if we already have this miner in loop then do nothing
      return this;
    }
    this._manufactureLoops.mining.add(minerId);
    // if the loop is empty, then main loop processor is stops
    const shouldRunLoop = this._loopShouldBeProcessed('mining');
    if (shouldRunLoop) {
      this._loopProcessor('mining').then(); // just run and don't await
    }
    return this;
  }

  public startLoop(target :ILoopName = 'main') {
    this._manufactureLoopStatuses[target] = 'run';
    this._loopProcessor(target).then(); // just run and don't await
    return this;
  }

  public pauseLoop(target :ILoopName = 'main') {
    this._manufactureLoopStatuses[target] = 'idle'; // loop stops on next step
    return this;
  }

  /**
   * Check for current status of loop and
   * if loop is idle and can be processed then return true
   * @param target
   * @private
   */
  private _loopShouldBeProcessed(target :ILoopName) {
    return this._manufactureLoopStatuses[target] === 'idle'
      && !this._manufactureLoops[target].isEmpty;
  }

  private async _loopProcessor(target :ILoopName = 'main', isContinue = false) {
    if (this._manufactureLoopStatuses[target] !== 'run') {
      this._manufactureLoopStatuses[target] = 'run';
      this._manufactureLoopAwaiter[target] = promise();
    } else if (!isContinue) { // prevent double-run
      return;
    }
    const loop = this._manufactureLoops[target];
    await wait(0); // move the process from current EV tick, microtask, task
    let maxTicks = 1000;
    let paused = false;
    while (maxTicks-- > 0) {
      const next = loop.next();
      if (next === undefined || this._manufactureLoopStatuses[target] !== 'run') {
        paused = next != null && this._manufactureLoopStatuses[target] !== 'run';
        break;
      }
      if (target !== 'mining') {
        const isLastRun = await this._onePipeTickOfManufacture(next as Manufacture, loop as Loop<Manufacture>);
        if (isLastRun) {
          break;
        }
      } else {
        const isLastRun = await this._mimingOfManufacture(next as bigint, loop as Loop<bigint>);
        if (isLastRun) {
          break;
        }
      }
    }
    // if not paused AND we have a work then run next round
    if (!paused && this._loopShouldBeProcessed(target)) {
      this._loopProcessor(target, true).then();
    } else {
      this._manufactureLoopStatuses[target] = 'idle';
      this._manufactureLoopAwaiter[target]?.done();
    }
  }

  /**
   * Tick of manufacture from loop if possible
   * @param manufacture
   * @param loop
   * @return true if is finished
   * @private
   */
  private async _onePipeTickOfManufacture(manufacture :Manufacture, loop :Loop<Manufacture>) {
    const res = await manufacture.tick();
    if (res === null) { // all pipes and all processes don't produce ani piece
      (loop as Loop<Manufacture>).remove(manufacture);
      if (loop.isEmpty) {
        return true;
      }
    } else if (res instanceof Error) {
      console.error(
        `Manufacture ${manufacture.getModel()?.mid}:"${manufacture.getModel()?.title}" has error on tick:`,
        res.message,
      );
    }
    return false;
  }

  private async _mimingOfManufacture(minerId :bigint, loop :Loop<bigint>) {
    const manufactureEntity = await this._repoManufacture.findOneBy({
      buildings: {
        bid: minerId,
      },
    });
    if (manufactureEntity) {
      const manufacture = this._manufactures.get(manufactureEntity.mid);
      if (!manufacture) {
        console.error(`Manufacture by entity ${manufactureEntity.mid} not found`);
      } else {
        const res = await manufacture.mining(minerId);
        if (res.addNewPieces > 0) {
          this._onManufactureReceive(manufactureEntity);
        }
      }
    }
    (loop as Loop<bigint>).remove(minerId);
    return loop.isEmpty;
  }

  public async addBuildingToFacility(building :IBuilding, pipe ?:IPipe) {
    if (!building.manufacture) {
      throw new Error('Building has no manufacture');
    }
    if (!building.isMiner && !pipe) {
      throw new Error('pipe is required for non-miner building');
    }
    if (this._facility.hasBuilding(building.id)) {
      // do nothing: building already is works
      return;
    }
    if (this._queueArea.has(building.id)) {
      // do nothing: building is in queue
      return;
    }
    // we should process building
    // by reasons the building not in queue and not in facility, make new from scratch
    const item :IQueueItem & IFacilityPushArgs = {
      building,
      pipe: pipe,
      batch: null,
      nice: building.nice,
      vRuntime: -1,
    };
    this._queueArea.push(item);
  }

  private _pushItemToFacility(item :IQueueItem) {
    this
      ._facility
      .push(item)
      .then((result) => {
        const { spentTime } = result;
        item.vRuntime = QueueArea.getNewVRuntime(spentTime, item);
        this._queueArea.push(item);
      })
    ;
  }

  private _runFacilityFromQueue() {
    for (let i = this._facility.size; i < this._facility.capacity; i++) {
      const exclusiveIds = this._facility.getExclusives();
      if (this._queueArea.isEmpty) {
        break;
      }
      const item = this._queueArea.pop(...exclusiveIds);
      if (!item) {
        break;
      }
      this._pushItemToFacility(item);
    }
  }
}
