import { Repository } from 'typeorm';
import { IBuildingTypeDescriptor } from '@pipecraft/types';
import { ManufactureEntity } from '@/db/entities/ManufactureEntity';
import { PieceEntity } from '@/db/entities/PieceEntity';
import { BuildingEntity } from '@/db/entities/BuildingEntity';
import { ManufactureMaker } from '@/parts/Manufacture/ManufactureMaker';
import { Manufacture } from '@/parts/Manufacture/Manufacture';
import { IOnReceive } from '@/parts/Manufacture/IManufactureElement';
import { Loop } from '@/parts/Hub/Loop';
import { wait } from '@/parts/async';

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
}

export interface IHubArgs {
  repoPieces :Repository<PieceEntity>;
  repoManufacture :Repository<ManufactureEntity>;
  buildingTypes :Map<string, IBuildingTypeDescriptor>;
  onReceive :IOnReceive;
}

export class Hub implements IHub {
  private _manufactures :Map<bigint, Manufacture>;
  private _repoManufacture :Repository<ManufactureEntity>;
  private _repoPieces :Repository<PieceEntity>;
  private _buildingTypes :Map<string, IBuildingTypeDescriptor>;
  private _onReceive :IOnReceive;
  private _manufactureLoopStatuses :{
    [key in ILoopName] :'run' | 'idle';
  };
  private _manufactureLoops :{
    [key in ILoopName] :Loop<ILoopMap[key]>;
  };

  constructor(args :IHubArgs) {
    this._repoManufacture = args.repoManufacture;
    this._repoPieces = args.repoPieces;
    this._buildingTypes = args.buildingTypes;
    this._onReceive = args.onReceive;
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
  }

  private _onManufactureReceive = (manufactureEntity :ManufactureEntity) :IOnReceive => (buildingEntity, pieces) => {
    if (pieces.length > 0) {
      const manufacture = this._manufactures.get(manufactureEntity.mid)!;
      if (!this._manufactureLoops.main.has(manufacture)) {
        this._manufactureLoops.main.add(manufacture);
      }
    }
    return this._onReceive(buildingEntity, pieces);
  };

  public async loadAllManufactures() {
    const manufactureEntities = await this._repoManufacture.findBy({});
    for (const entity of manufactureEntities) {
      const manufacture = await ManufactureMaker.loadManufacture({
        manufactureModel: entity,
        onReceive: this._onManufactureReceive(entity),
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
      this._loopProcessor('mining').then(); // just run and dont await
    }
    return this;
  }

  public startLoop(target :ILoopName = 'main') {
    return this;
  }

  public pauseLoop(target :ILoopName = 'main') {
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
      || !this._manufactureLoops[target].isEmpty;
  }

  private async _loopProcessor(target :ILoopName = 'main') {
    this._manufactureLoopStatuses[target] = 'run';
    const loop = this._manufactureLoops[target];
    await wait(0); // move the process from current EV tick, microtask, task
    let maxTicks = 1000;
    while (maxTicks-- > 0) {
      const next = loop.next();
      if (next === undefined) {
        break;
      }
      if (target === 'main') {
        const manufacture = next as Manufacture;
        const res = await manufacture.tick();
        if (res === null) { // all pipes and all processes don't produce ani piece
          (loop as Loop<Manufacture>).remove(manufacture);
          if (loop.isEmpty) {
            break;
          }
        } else if (res instanceof Error) {
          console.error(
            `Manufacture ${manufacture.getModel()?.mid}:"${manufacture.getModel()?.title}" has error on tick:`,
            res.message,
          );
        }
        continue;
      }
      const minerId = next as bigint;
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
          await manufacture.mining(minerId);
        }
      }
      (loop as Loop<bigint>).remove(minerId);
      if (loop.isEmpty) {
        break;
      }
    }
    this._manufactureLoopStatuses[target] = 'idle';
  }
}
