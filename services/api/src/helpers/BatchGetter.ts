import { IPieceId } from '@pipecraft/types';

export interface IBatchGetterProps {
  firstCursor :IPieceId;
  lastCursor :IPieceId;
  holdList :Set<IPieceId>;
  heapList :Set<IPieceId>;
  recycleList :Set<IPieceId>;
}

export type IHeapLike = Set<IPieceId>|Array<IPieceId>;

export abstract class BatchGetter {
  protected _firstCursor :IPieceId;
  protected _lastCursor :IPieceId;
  protected _holdList :Set<IPieceId>;
  protected _heapList :Set<IPieceId>;
  protected _recycleList :Set<IPieceId>;

  constructor(args :IBatchGetterProps) {
    this._firstCursor = args.firstCursor;
    this._lastCursor = args.lastCursor;
    this._holdList = args.holdList;
    this._heapList = args.heapList;
    this._recycleList = args.recycleList;
  }

  /**
   * return list of id from heap exclude hold
   * @param size
   */
  abstract getBatch(size :number) :IPieceId[];

  /**
   * release ids from hold
   * @param ids
   */
  public release(ids :IPieceId[]) :void {
    for (let i = 0; i < ids.length; i++){
      const id = ids[i];
      this._holdList.delete(id); // Remove IDs from hold list
    }
  }

  /**
   * recycle ids (on fail or when skipped)
   * release these ids from hold
   * @param ids
   */
  public recycle(ids :IPieceId[]) :void {
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      this._recycleList.add(id); // Add IDs directly to recycle list
      this._holdList.delete(id);
    }
  }

  protected _recycleFromPointerToEnd(cursor :IPieceId, heap :IHeapLike, order :'direct'|'reverse') :number {
    let added = 0;
    for (const pointer of heap) {
      if (order === 'direct' && pointer >= cursor) {
        break;
      }
      if (order === 'reverse' && pointer <= cursor) {
        break;
      }
      added++;
      this._recycleList.add(pointer);
    }
    return added;
  }

  protected _actualRecycleList(sort :(a :IPieceId, b :IPieceId) =>number) {
    const sortedRecycleList = Array.from(this._recycleList).sort(sort);
    // refill recycle list
    this._recycleList.clear();
    for (const pointer of sortedRecycleList) {
      this._recycleList.add(pointer);
    }
    return sortedRecycleList[0] || -1n as IPieceId;
  }

  protected _getResultFromRecycleList(size :number) {
    const result :IPieceId[] = [];
    for (const candidate of this._recycleList.difference(this._holdList)) {
      if (result.length === size) {
        break;
      }
      result.push(candidate);
      this._holdList.add(candidate);
      this._recycleList.delete(candidate);
    }
    return result;
  }

  protected _fillResultFromHeap(size :number, result :IPieceId[], currentHeap :IHeapLike, currentCursor :IPieceId) {
    const localHeap = new Set(currentHeap);
    let cursor = currentCursor;
    for (const candidate of localHeap.difference(this._holdList)) {
      if (result.length === size) {
        break;
      }
      if (this._firstCursor <= candidate && candidate <= this._lastCursor) {
        continue;
      }
      cursor = candidate;
      result.push(candidate);
      this._holdList.add(candidate);
    }
    return cursor;
  }
}
