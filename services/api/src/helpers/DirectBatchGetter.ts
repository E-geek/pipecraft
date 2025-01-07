import { IPieceId } from '@pipecraft/types';
import { BatchGetter, IBatchGetterProps } from './BatchGetter';

const sort = (a :IPieceId, b :IPieceId) => a > b ? 1 : -1;

export class DirectBatchGetter extends BatchGetter {

  constructor(args :IBatchGetterProps) {
    super(args);
  }

  getBatch(size :number) :IPieceId[] {
    if (this._heapList.size === 0 && this._recycleList.size === 0) {
      return [];
    }
    const result :IPieceId[] = [];
    const cursor = this._firstCursor;
    if (cursor !== -1n) { // not init
      let added = 0;
      for (const pointer of this._heapList) {
        if (pointer >= cursor) {
          break;
        }
        added++;
        this._recycleList.add(pointer);
      }
      // main way: entry to condition, check for first is first, done
      if (added > 0) {
        // must be sorted
        const sortedRecycleList = Array.from(this._recycleList).sort(sort);
        // refill recycle list
        this._recycleList.clear();
        for (const pointer of sortedRecycleList) {
          this._recycleList.add(pointer);
        }
        this._firstCursor = sortedRecycleList[0] || -1n as IPieceId;
      }
    } else {
      const firstValueOfRecycle = this._recycleList.values().next().value ?? -1n as IPieceId;
      const firstValueOfHeap = this._heapList.values().next().value ?? -1n as IPieceId;
      this._firstCursor = firstValueOfHeap < firstValueOfRecycle ? firstValueOfHeap : firstValueOfRecycle;
    }
    for (const candidate of this._recycleList.difference(this._holdList)) {
      if (result.length === size) {
        break;
      }
      result.push(candidate);
      this._holdList.add(candidate);
      this._recycleList.delete(candidate);
    }
    if (result.length === size) {
      return result;
    }
    for (const candidate of this._heapList.difference(this._holdList)) {
      if (result.length === size) {
        break;
      }
      if (candidate <= this._lastCursor) {
        continue;
      }
      this._lastCursor = candidate;
      result.push(candidate);
      this._holdList.add(candidate);
    }
    return result.sort(sort);
  }
}
