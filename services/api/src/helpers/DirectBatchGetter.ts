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
    const cursor = this._firstCursor;
    if (cursor !== -1n) { // init has done
      const added = this._recycleFromPointerToEnd(cursor, this._heapList, 'direct');
      if (added > 0) {
        this._firstCursor = this._actualRecycleList(sort);
      }
    } else {
      const firstValueOfRecycle = this._recycleList.values().next().value ?? -1n as IPieceId;
      const firstValueOfHeap = this._heapList.values().next().value ?? -1n as IPieceId;
      this._firstCursor = firstValueOfHeap < firstValueOfRecycle ? firstValueOfHeap : firstValueOfRecycle;
    }
    const result = this._getResultFromRecycleList(size);
    if (result.length === size) {
      return result.sort(sort);
    }
    this._lastCursor = this._fillResultFromHeap(size, result, this._heapList, this._lastCursor);
    return result.sort(sort);
  }
}
