import { IPieceId } from '@pipecraft/types';

export interface IBatchGetterProps {
  firstCursor :IPieceId;
  lastCursor :IPieceId;
  holdList :Set<IPieceId>;
  heapList :Set<IPieceId>;
  recycleList :Set<IPieceId>;
}

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
  abstract release(ids :IPieceId[]) :void;

  /**
   * recycle ids (on fail or when skipped)
   * @param ids
   */
  abstract recycle(ids :IPieceId[]) :void;
}
