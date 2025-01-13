import { IPieceId } from '@pipecraft/types';
import { IAttempts } from '@/db/entities/PipeEntity';

export interface IBatchGetterProps {
  firstCursor :IPieceId;
  lastCursor :IPieceId;
  holdList :Set<IPieceId>;
  heapList :Set<IPieceId>;
  recycleList :Map<IPieceId, IAttempts>;
}

export type IHeapLike = Set<IPieceId>|Array<IPieceId>;

export interface IBatchGetter {
  readonly firstCursor :IPieceId;
  readonly lastCursor :IPieceId;
  getBatch(size :number) :IPieceId[];
  release(ids :IPieceId[]) :void;
  recycle(ids :IPieceId[]) :void;
}

export abstract class BatchGetter implements IBatchGetter {
  protected _firstCursor :IPieceId;
  protected _lastCursor :IPieceId;
  protected _holdList :Set<IPieceId>;
  protected _heapList :Set<IPieceId>;
  protected _recycleList :Map<IPieceId, IAttempts>;

  protected constructor(args :IBatchGetterProps) {
    this._firstCursor = args.firstCursor;
    this._lastCursor = args.lastCursor;
    this._holdList = args.holdList;
    this._heapList = args.heapList;
    this._recycleList = args.recycleList;
  }

  /**
   * getter for firstCursor current value
   */
  get firstCursor() :IPieceId {
    return this._firstCursor;
  }

  /**
   * getter for lastCursor current value
   */
  get lastCursor() :IPieceId {
    return this._lastCursor;
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
   * @param ids IPieceId[]
   */
  public recycle(ids :IPieceId[]) :void {
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const attempts = ((this._recycleList.get(id) ?? 0) + 1) as IAttempts;
      this._recycleList.set(id, attempts); // Add IDs directly to recycle list
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
      this._recycleList.set(pointer, 0 as IAttempts);
    }
    return added;
  }

  protected _actualRecycleList(sort :(a :[IPieceId, IAttempts], b :[IPieceId, IAttempts]) =>number) {
    const sortedRecycleList = Array.from(this._recycleList).sort(sort);
    // refill recycle list
    this._recycleList.clear();
    for (const [ pointer, attempts ] of sortedRecycleList) {
      this._recycleList.set(pointer, attempts);
    }
    return (sortedRecycleList[0] ?? [ -1n as IPieceId ])[0] || -1n as IPieceId;
  }

  protected _getResultFromRecycleList(size :number) {
    const result :IPieceId[] = [];
    const recycleSet = new Set(this._recycleList.keys());
    for (const candidate of recycleSet.difference(this._holdList)) {
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
