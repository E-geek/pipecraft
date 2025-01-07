import { IPieceId } from '@pipecraft/types';
import { BatchGetter, IBatchGetterProps } from './BatchGetter';

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
    return result;
  }
}
