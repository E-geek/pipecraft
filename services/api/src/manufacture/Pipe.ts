import { IPiece, IPieceId } from '@pipecraft/types';
import { FindManyOptions, FindOperator, In, LessThan, MoreThan, Or, Repository } from 'typeorm';
import { FindOptionsWhere } from 'typeorm/find-options/FindOptionsWhere';
import { IAttempts, PipeMemory } from '@/db/entities/PipeMemory';
import { Piece } from '@/db/entities/Piece';
import { IBuilding } from '@/manufacture/Building';
import { IManufactureElement } from '@/manufacture/IManufactureElement';
import { IBatchGetter } from '@/helpers/BatchGetter';
import { DirectBatchGetter } from '@/helpers/DirectBatchGetter';
import { ReverseBatchGetter } from '@/helpers/ReverseBatchGetter';

export interface IPipe extends IManufactureElement {
  type :'pipe';
  from :IBuilding;
  to :IBuilding;
  maxAttempts :IAttempts;
  maxHistoryDepth :number;

  make() :Promise<void>;
  sync() :Promise<void>;

  getModel() :PipeMemory;

  getBatch() :Promise<IPiece[]>;

  releaseBatch(pid :IPieceId[]) :void;

  failBatch(pid :IPieceId[]) :void;
}

export interface IPipeParams {
  pipeMemory :PipeMemory;
  from :IBuilding;
  to :IBuilding;
  heap :Repository<Piece>;
}

export class Pipe implements IPipe {
  private readonly _model :PipeMemory;
  private readonly _from :IBuilding;
  private readonly _to :IBuilding;
  private readonly _heap :Repository<Piece>;
  private readonly _batchSize :{
    size :number;
    isPercent :boolean;
  };
  private _batchGetter :IBatchGetter;

  public readonly maxAttempts = 5 as IAttempts;
  public readonly maxHistoryDepth = 1000 * 60 * 60 * 24 * 30 * 3; // 3 months

  private _heapSet :Set<IPieceId>;
  private _recycleMap :Map<IPieceId, IAttempts>;
  private _holdSet :Set<IPieceId>;

  public type :IPipe['type'] = 'pipe';

  constructor({ pipeMemory, from, to, heap } :IPipeParams) {
    this._model = pipeMemory;
    this._from = from;
    this._to = to;
    this._heap = heap;
    // unpack batch data
    const batchSizeRaw = this._to.batchSize;
    const isPercent = batchSizeRaw[batchSizeRaw.length - 1] === '%';
    const size = parseInt(batchSizeRaw, 10);
    if (size === 0) {
      this._batchSize = {
        size: 100,
        isPercent: true,
      };
    } else {
      this._batchSize = {
        size: size,
        isPercent,
      };
    }
  }

  get from() {
    return this._from;
  }

  get to() {
    return this._to;
  }

  getModel() :PipeMemory {
    return this._model;
  }

  private async _getActualHeap() :Promise<IPieceId[]> {
    const options = this._getWhereOptions();
    const heap = await this._heap.find(options);
    return heap.map(({ pid }) => pid);
  }

  private async _buildBatchGetter() {
    const { ordering, firstCursor, lastCursor } = this._model;
    const heap = await this._getActualHeap();
    if (heap.length === 0 && this._model.reserved.length === 0) {
      return; // no pieces and no reserved
    }
    const heapSet = new Set(heap);
    const recycleSet = new Map<IPieceId, IAttempts>(this._model.returned);
    const holdSet = new Set(this._model.reserved);
    if (ordering === 'direct') {
      this._batchGetter = new DirectBatchGetter({
        firstCursor: firstCursor as IPieceId,
        lastCursor: lastCursor as IPieceId,
        heapList: heapSet,
        recycleList: recycleSet,
        holdList: holdSet,
      });
    } else {
      this._batchGetter = new ReverseBatchGetter({
        firstCursor: firstCursor as IPieceId,
        lastCursor: lastCursor as IPieceId,
        heapList: heapSet,
        recycleList: recycleSet,
        holdList: holdSet,
      });
    }
    this._heapSet = heapSet;
    this._recycleMap = recycleSet;
    this._holdSet = holdSet;
  }

  public async make() {
    if (this._batchGetter) {
      return;
    }
    await this._buildBatchGetter();
  }

  public async sync() {
    await this._model.reload();
    if (this._model.firstCursor !== (-1n as IPieceId)
      && this._model.firstCursor < this._batchGetter.firstCursor
      || this._model.lastCursor > this._batchGetter.lastCursor) {
      // if async from DB then rebuild
      console.error('Pipe sync failed: cursors changes outside current pipe');
      await this._buildBatchGetter();
      return;
    }
    this._model.firstCursor = this._batchGetter.firstCursor;
    this._model.lastCursor = this._batchGetter.lastCursor;
    this._model.reserved = [ ...this._holdSet ];
    this._model.returned = [ ...this._recycleMap.entries() ];
    await this._model.save();
    const actualHeap = await this._getActualHeap();
    for (let i = 0; i < actualHeap.length; i++){
      const pieceId = actualHeap[i];
      this._heapSet.add(pieceId);
    }
  }

  private _getWhereOptions() :FindManyOptions<Piece> {
    const from = this._from.id;
    const { ordering, firstCursor, lastCursor } = this._model;
    const pidCondition :FindOperator<any>[] = [];
    if (firstCursor >= 0) {
      pidCondition.push(LessThan(firstCursor));
    }
    if (lastCursor >= 0) {
      pidCondition.push(MoreThan(lastCursor));
    }
    const options :FindManyOptions<Piece> = {
      select: [ 'pid' ],
      where: {
        from: {
          bid: from,
        },
        createdAt: MoreThan(new Date(Date.now() - this.maxHistoryDepth)),
      },
      order: {
        pid: ordering === 'reverse' ? 'DESC' : 'ASC',
      }
    };
    if (pidCondition.length) {
      (options.where as FindOptionsWhere<Piece>).pid = pidCondition.length === 2 ? Or(...pidCondition) : pidCondition[0];
    }
    return options;
  }

  public async getBatch() :Promise<IPiece[]> {
    if (this._batchSize.isPercent) {
      return []; // not ready
    }
    const batch = this._batchGetter.getBatch(this._batchSize.size);
    if (batch.length < this._batchSize.size) {
      await this.sync();
      const addForBatch = this._batchGetter.getBatch(this._batchSize.size);
      batch.concat(addForBatch);
    }
    const pieces = await this._heap.find({
      where: {
        pid: In(batch),
      },
    });
    return pieces.map(({ data }) => data as IPiece);
  }

  releaseBatch(pid :IPieceId[]) {
    this._batchGetter.release(pid);
  }

  failBatch(pid :IPieceId[]) {
    this._batchGetter.recycle(pid);
  }
}
