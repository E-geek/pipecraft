import { IPieceId } from '@pipecraft/types';
import { BatchGetter, IBatchGetterProps } from './BatchGetter';

const sort = (a :IPieceId, b :IPieceId) => a > b ? -1 : 1;

export class ReverseBatchGetter extends BatchGetter {
  constructor(args :IBatchGetterProps) {
    super(args);
  }

  getBatch(size :number) :IPieceId[] {
    if (this._heapList.size === 0 && this._recycleList.size === 0) {
      return [];
    }
    const result :IPieceId[] = [];
    const cursor = this._lastCursor;
    const _reversedHeap = Array.from(this._heapList).reverse();
    if (cursor !== -1n) { // init has done
      let added = 0;
      for (const pointer of _reversedHeap) {
        if (pointer <= cursor) {
          break;
        }
        added++;
        this._recycleList.add(pointer);
      }
      if (added > 0) {
        // must be sorted
        const sortedRecycleList = Array.from(this._recycleList).sort(sort);
        // refill recycle list
        this._recycleList.clear();
        for (const pointer of sortedRecycleList) {
          this._recycleList.add(pointer);
        }
        this._lastCursor = sortedRecycleList[0] || -1n as IPieceId;
      }
    } else {
      const firstValueOfRecycle = this._recycleList.values().next().value ?? -1n as IPieceId;
      const firstValueOfReversedHeap = _reversedHeap[0] ?? -1n as IPieceId;
      this._lastCursor = firstValueOfReversedHeap > firstValueOfRecycle ? firstValueOfReversedHeap : firstValueOfRecycle;
    }
    if (this._firstCursor === -1n) {
      this._firstCursor = this._lastCursor + 1n as IPieceId;
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
      return result.sort(sort);
    }
    const reversedHeapSet = new Set(_reversedHeap);
    for (const candidate of reversedHeapSet.difference(this._holdList)) {
      if (result.length === size) {
        break;
      }
      if (candidate >= this._firstCursor) {
        continue;
      }
      result.push(candidate);
      this._firstCursor = candidate;
      this._holdList.add(candidate);
    }
    return result.sort(sort);
  }
}
