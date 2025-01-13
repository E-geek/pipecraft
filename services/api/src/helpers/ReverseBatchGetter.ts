import { IPieceId } from '@pipecraft/types';
import { IAttempts } from '@/db/entities/PipeEntity';
import { BatchGetter, IBatchGetterProps } from './BatchGetter';

const sortMap = ([ a ] :[IPieceId, IAttempts], [ b ] :[IPieceId, IAttempts]) => a > b ? -1 : 1;
const sort = (a :IPieceId, b :IPieceId) => a > b ? -1 : 1;

export class ReverseBatchGetter extends BatchGetter {
  constructor(args :IBatchGetterProps) {
    super(args);
  }

  getBatch(size :number) :IPieceId[] {
    if (this._heapList.size === 0 && this._recycleList.size === 0) {
      return [];
    }
    const cursor = this._lastCursor;
    const reversedHeap = Array.from(this._heapList).reverse();
    if (cursor !== -1n) { // init has done
      const added = this._recycleFromPointerToEnd(cursor, reversedHeap, 'reverse');
      if (added > 0) {
        this._lastCursor = this._actualRecycleList(sortMap);
      }
    } else {
      const firstValueOfRecycle = this._recycleList.values().next().value ?? -1n as IPieceId;
      const firstValueOfReversedHeap = reversedHeap[0] ?? -1n as IPieceId;
      this._lastCursor = firstValueOfReversedHeap > firstValueOfRecycle ? firstValueOfReversedHeap : firstValueOfRecycle;
    }
    if (this._firstCursor === -1n) {
      this._firstCursor = this._lastCursor + 1n as IPieceId;
    }
    const result = this._getResultFromRecycleList(size);
    if (result.length === size) {
      return result.sort(sort);
    }
    this._firstCursor = this._fillResultFromHeap(size, result, reversedHeap, this._firstCursor);
    return result.sort(sort);
  }
}
