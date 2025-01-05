import { IPieceId } from '@pipecraft/types';
import { BatchGetter, IBatchGetterProps } from './BatchGetter';

export class ReverseBatchGetter extends BatchGetter {
  constructor(args :IBatchGetterProps) {
    super(args);
  }

  getBatch(size :number) :IPieceId[] {
    const result :IPieceId[] = [];
    return result;
  }

  release(ids :IPieceId[]) :void {
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      this._holdList.delete(id);
    }
  }

  recycle(ids :IPieceId[]) :void {
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      this._recycleList.add(id);
    }
  }
}
