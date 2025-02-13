// Задача этого класса принимать на вход здания, пайпы и, иногда, батчи, дожидаться окончания работ,
// выдавать сигнал об окончании, говорить есть ли ещё места. Больше ничего

import { IPiece } from '@pipecraft/types';
import { IBuilding } from '@/parts/Manufacture/Building';
import { IPipe } from '@/parts/Manufacture/Pipe';

export interface IFacilityPushArgsMiner {
  building :IBuilding;
}

export interface IFacilityPushArgsFactoryRun {
  building :IBuilding;
  pipe :IPipe;
}

export interface IFacilityPushArgsFactoryBatchedRun {
  building :IBuilding;
  pipe :IPipe;
  batch :IPiece[];
}

export type IFacilityPushArgs = IFacilityPushArgsMiner | IFacilityPushArgsFactoryRun | IFacilityPushArgsFactoryBatchedRun;

export interface IFacilityResult {
  building :IBuilding;
  spentTime :number; // how much time has spent
  shouldContinue :boolean; // task is not finished, probably. Need continue to run this building and pipe
  pipe ?:IPipe; // only when pipe was in input
}

export interface IFacility {
  push(args :IFacilityPushArgs) :Promise<IFacilityResult>;
  readonly isFull :boolean;
  readonly capacity :number;
  readonly size :number;
  hasBuildingType(btid :bigint) :boolean;
  hasManufacture(mid :bigint) :boolean;
}

export class Facility implements IFacility {
  private _capacity :number;
  private _workers :Map<bigint, Promise<IFacilityResult>>;
  private readonly _buildingTypes = new Map<bigint, Set<bigint>>();
  private readonly _manufactures = new Map<bigint, Set<bigint>>();

  constructor(capacity :number) {
    this._capacity = capacity;
    this._workers = new Map();
  }

  public get capacity() :number {
    return this._capacity || Number.MAX_SAFE_INTEGER; // if zero, then infinity
  }

  public get size() :number {
    return this._workers.size;
  }

  public get isFull() :boolean {
    return this._workers.size >= this._capacity;
  }

  public push(args :IFacilityPushArgs) :Promise<IFacilityResult> {
    if (this._workers.has(args.building.id)) {
      return this._workers.get(args.building.id)!;
    }
    if (this.isFull) {
      throw new Error('Facility is full');
    }
    const { building } = args;
    if (!building.manufacture) {
      throw new Error('Building has no manufacture');
    }
    // check for exclusive building type exists
    if (building.isExclusiveBuildingType && this.hasBuildingType(building.buildingTypeId)) {
      throw new Error('Building type is exclusive, should moved to queue');
    }
    // check for manufacture is sequential and building is already working from the manufacture
    if (building.manufacture.isSequential && this.hasManufacture(building.manufacture.id)) {
      throw new Error('Building is already working from the manufacture');
    }
    building.setState('work');
    const workerId = building.id;
    const worker = this._work(args);
    this._workers.set(workerId, worker);
    if (building.isExclusiveBuildingType) {
      this.addBuildingIdToListOf(building.id, building.buildingTypeId, this._buildingTypes);
    }
    if (building.manufacture.isSequential) {
      this.addBuildingIdToListOf(building.id, building.manufacture.id, this._manufactures);
    }
    return worker;
  }

  private addBuildingIdToListOf(bid :bigint, targetId :bigint, list :Map<bigint, Set<bigint>>) {
    const buildingSet = list.get(targetId) ?? new Set<bigint>();
    buildingSet.add(bid);
    if (buildingSet.size === 1) {
      list.set(targetId, buildingSet);
    }
  }

  private removeBuildingIdFromListOf(bid :bigint, targetId :bigint, list :Map<bigint, Set<bigint>>) {
    const buildingSet = list.get(targetId);
    if (buildingSet) {
      buildingSet.delete(bid);
      if (!buildingSet.size) {
        list.delete(targetId);
      }
    }
  }

  private async _work(args :IFacilityPushArgs) :Promise<IFacilityResult> {
    const { building, batch, pipe } = (args as IFacilityPushArgsFactoryBatchedRun);
    if (!building.manufacture) {
      throw new Error('Building has no manufacture');
    }
    await Promise.resolve(); // detach from current microtask loop
    const start = Date.now();
    let shouldContinue = false;
    if (building.isMiner) {
      await building.manufacture.mining(building.id);
    } else if (batch) {
      const res = await building.manufacture.pipeTickWithBatch(pipe, batch);
      shouldContinue = res !== null;
    } else {
      const res = await building.manufacture.pipeTick(pipe!);
      shouldContinue = res !== null;
    }
    const spentTime = Date.now() - start;
    this._workers.delete(building.id);
    this.removeBuildingIdFromListOf(building.id, building.buildingTypeId, this._buildingTypes);
    this.removeBuildingIdFromListOf(building.id, building.manufacture.id, this._manufactures);
    return { building, pipe, spentTime, shouldContinue };
  }

  public hasBuilding(bid :bigint) :boolean {
    return this._workers.has(bid);
  }

  public hasBuildingType(btid :bigint) :boolean {
    return this._buildingTypes.has(btid);
  }

  public hasManufacture(mid :bigint) :boolean {
    return this._manufactures.has(mid);
  }

  public getExclusives() :[bigint[], bigint[]] {
    return [
      [ ...this._buildingTypes.keys() ],
      [ ...this._manufactures.keys() ],
    ];
  }
}
