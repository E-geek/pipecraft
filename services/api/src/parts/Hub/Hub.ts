import { Repository } from 'typeorm';
import { IBuildingTypeDescriptor } from '@pipecraft/types';
import { ManufactureEntity } from '@/db/entities/ManufactureEntity';
import { PieceEntity } from '@/db/entities/PieceEntity';
import { ManufactureMaker } from '@/parts/Manufacture/ManufactureMaker';
import { Manufacture } from '@/parts/Manufacture/Manufacture';
import { IBuilding } from '@/parts/Manufacture/Building';
import { IPipe } from '@/parts/Manufacture/Pipe';
import { Facility, IFacilityPushArgs } from '@/parts/Hub/Facility';
import { IQueueItem, QueueArea } from '@/parts/Hub/QueueArea';
import { IPromise, promise } from '@/parts/async';

export interface IHub {
  /**
   * All manufactures bi mid
   */
  readonly allManufactures :Map<bigint, Manufacture>;

  /**
   * Loading all manufactures to the memory
   * All manufactures after loading is inactive and not in loop
   */
  loadAllManufactures :() =>Promise<IHub | Error>;

  /**
   * Wait for finish manufacture
   * @param mid
   */
  waitForFinish(mid :bigint) :Promise<void>;
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
  private _manufactureFinishWaiters :Map<bigint, IPromise<void>[]>;

  constructor(args :IHubArgs) {
    this._repoManufacture = args.repoManufacture;
    this._repoPieces = args.repoPieces;
    this._buildingTypes = args.buildingTypes;
    // init value
    this._manufactures = new Map();
    this._facility = new Facility(32);
    this._queueArea = new QueueArea();
    this._manufactureFinishWaiters = new Map();
  }

  private _onBuildingProducePieces(building :IBuilding) {
    const manufacture = building.manufacture!;
    const pipes = manufacture.getPipesFrom(building);
    for (let i = 0; i < pipes.length; i++){
      const pipe = pipes[i];
      this.addBuildingToFacility(pipe.to, pipe);
    }
  }

  public async loadAllManufactures() {
    const manufactureEntities = await this._repoManufacture.findBy({});
    for (const entity of manufactureEntities) {
      const manufacture = await ManufactureMaker.loadManufacture({
        manufactureModel: entity,
        onStorePieces: (building) => {
          this._onBuildingProducePieces(building);
        },
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
    this._runFacilityFromQueue();
  }

  private _pushItemToFacility(item :IQueueItem) {
    this
      ._facility
      .push(item)
      .then((result) => {
        const { spentTime } = result;
        item.building.setState('idle');
        item.vRuntime = QueueArea.getNewVRuntime(spentTime, item);
        if (result.shouldContinue) {
          this._queueArea.push(item);
        } else {
          const mid = item.building.manufacture!.id;
          if (!this._checkManufactureIsWorking(mid)) {
            this._onFinishManufacture(mid);
          }
        }
        this._runFacilityFromQueue();
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

  public get allManufactures() :Map<bigint, Manufacture> {
    return this._manufactures;
  }

  private _checkManufactureIsWorking(mid :bigint) :boolean {
    const manufacture = this._manufactures.get(mid);
    if (!manufacture) {
      return false;
    }
    let detected = false;
    const { buildings } = manufacture;
    for (let i = 0; i < buildings.length; i++){
      const building = buildings[i];
      if (this._facility.hasBuilding(building.id)) {
        detected = true;
        break;
      }
      if (this._queueArea.has(building.id)) {
        detected = true;
        break;
      }
    }
    return detected;
  }

  private _onFinishManufacture(mid :bigint) {
    const list = this._manufactureFinishWaiters.get(mid);
    if (!list) {
      return;
    }
    this._manufactureFinishWaiters.delete(mid);
    for (let i = 0; i < list.length; i++){
      list[i].done();
    }
  }

  public waitForFinish(mid :bigint) :Promise<void> {
    const awaiter = promise<void>();
    const isWorking = this._checkManufactureIsWorking(mid);
    if (!isWorking) {
      awaiter.done();
    } else {
      const list = this._manufactureFinishWaiters.get(mid) ?? [];
      list.push(awaiter);
      if (list.length === 1) {
        this._manufactureFinishWaiters.set(mid, list);
      }
    }
    return awaiter.promise;
  }
}
