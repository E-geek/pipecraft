import { IPiece, Nullable } from '@pipecraft/types';
import { IBuilding } from '@/parts/Manufacture/Building';
import { IPipe } from '@/parts/Manufacture/Pipe';

export interface IQueueItem {
  building :IBuilding;
  pipe :Nullable<IPipe>;
  batch :Nullable<IPiece[]>;
  nice :number;
  vRuntime :number; // should be -1 for new items
}

export interface IQueueArea {
  readonly isEmpty :boolean;
  push(item :IQueueItem) :IQueueArea;
  pop(exclusiveIds :bigint[], seqManufactureIds :bigint[]) :IQueueItem|null;
  has(bid :bigint) :boolean;
}

export class QueueArea {
  private _heap :IQueueItem[];
  constructor() {
    this._heap = [];
  }

  public get isEmpty() {
    return this._heap.length === 0;
  }

  push(item :IQueueItem) :IQueueArea {
    const pushedItem = { ...item  };
    if (!pushedItem.building.manufacture) {
      throw new Error('Building has no manufacture');
    }
    if (pushedItem.vRuntime === -1) {
      if (this.isEmpty) {
        pushedItem.vRuntime = 0;
      } else {
        let minVRuntime = this._heap[0].vRuntime;
        // search min value
        for (let i = 1; i < this._heap.length; i++) {
          if (this._heap[i].vRuntime < minVRuntime) {
            minVRuntime = this._heap[i].vRuntime;
          }
        }
        pushedItem.vRuntime = minVRuntime;
      }
    }
    pushedItem.building.setState('wait');
    this._heap.push(pushedItem);
    return this;
  }

  pop(exclusiveIds :bigint[], seqManufactureIds :bigint[]) {
    if (this.isEmpty) {
      return null;
    }
    const exclusiveIdsSet = new Set(exclusiveIds);
    const seqManufactureIdsSet = new Set(seqManufactureIds);
    let minVRuntime = Number.MAX_SAFE_INTEGER;
    let minIndex = -1;
    // should be optimised
    for (let i = 0; i < this._heap.length; i++) {
      const item = this._heap[i];
      const { vRuntime, building } = item;
      if (exclusiveIdsSet.has(building.buildingTypeId)) {
        continue;
      }
      if (seqManufactureIdsSet.has(building.manufacture!.id)) {
        continue;
      }
      if (!building.isBuildingCanFacility()) {
        continue;
      }
      if (vRuntime < minVRuntime) {
        minVRuntime = vRuntime;
        minIndex = i;
      }
    }
    if (minIndex === -1) {
      return null;
    }
    const item = this._heap[minIndex];
    this._heap.splice(minIndex, 1);
    item.building.setState('idle');
    return item;
  }

  public has(bid :bigint) {
    return this._heap.some(item => item.building.id === bid);
  }

  public static getNewVRuntime(cpuTime :number, item :IQueueItem) {
    const weight = 1024 / Math.pow(1.25, item.nice);
    const dVRuntime = (cpuTime * weight) |0;
    return item.vRuntime + dVRuntime;
  }
}
