import { IAttempts, IPiece, IPieceId, Nullable } from '@pipecraft/types';
import { FindManyOptions, FindOperator, In, LessThan, MoreThan, Or, Repository } from 'typeorm';
import { FindOptionsWhere } from 'typeorm/find-options/FindOptionsWhere';
import { PipeEntity } from '@/db/entities/PipeEntity';
import { PieceEntity } from '@/db/entities/PieceEntity';
import { IBuilding } from '@/parts/Manufacture/Building';
import { IManufactureElement } from '@/parts/Manufacture/IManufactureElement';
import { IBatchGetter } from '@/parts/BatchGetter/BatchGetter';
import { DirectBatchGetter } from '@/parts/BatchGetter/DirectBatchGetter';
import { ReverseBatchGetter } from '@/parts/BatchGetter/ReverseBatchGetter';
import { IManufacture } from '@/parts/Manufacture/Manufacture';

export interface IPipe extends IManufactureElement {
  type :'pipe';
  from :IBuilding;
  to :IBuilding;
  maxAttempts :IAttempts;
  maxHistoryDepth :number;
  manufacture ?:Nullable<IManufacture>;

  make() :Promise<void>;
  sync() :Promise<void>;

  getModel() :PipeEntity;

  getBatch() :Promise<IPiece[]>;

  releaseBatch(pid :IPieceId[]) :void;

  failBatch(pid :IPieceId[]) :void;
}

export interface IPipeParams {
  pipeMemory :PipeEntity;
  from :IBuilding;
  to :IBuilding;
  heap :Repository<PieceEntity>;
  maximumAllocateBatchForPercent ?:number;
}

export class Pipe implements IPipe {
  private readonly _model :PipeEntity;
  private readonly _from :IBuilding;
  private readonly _to :IBuilding;
  private readonly _heap :Repository<PieceEntity>;
  private readonly _batchSize :{
    size :number;
    isPercent :boolean;
  };
  private _batchGetter :IBatchGetter;

  public readonly maximumAllocateBatchForPercent :number = 1000;
  public readonly maxAttempts = 5 as IAttempts;
  public readonly maxHistoryDepth = 1000 * 60 * 60 * 24 * 30 * 3; // 3 months

  // noinspection JSMismatchedCollectionQueryUpdate
  private _heapSet :Set<IPieceId>;
  private _recycleMap :Map<IPieceId, IAttempts>;
  private _holdSet :Set<IPieceId>;

  public type :IPipe['type'] = 'pipe';

  public manufacture :Nullable<IManufacture> = null;

  constructor({ pipeMemory, from, to, heap, maximumAllocateBatchForPercent } :IPipeParams) {
    this._model = pipeMemory;
    this._from = from;
    this._to = to;
    this._heap = heap;
    // unpack batch data
    const batchSizeRaw = this._to.batchSize;
    const isPercent = batchSizeRaw[batchSizeRaw.length - 1] === '%';
    const size = parseInt(batchSizeRaw, 10);
    if (maximumAllocateBatchForPercent != null) {
      this.maximumAllocateBatchForPercent = maximumAllocateBatchForPercent;
    }
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

  getModel() :PipeEntity {
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
    if (heap.length === 0 && this._model.holdList.length === 0) {
      return; // no pieces in heap and hold
    }
    const heapSet = new Set(heap);
    const recycleSet = new Map<IPieceId, IAttempts>(this._model.recycleList);
    const holdSet = new Set(this._model.holdList);
    if (ordering === 'direct') {
      this._batchGetter = new DirectBatchGetter({
        firstCursor: firstCursor as IPieceId,
        lastCursor: lastCursor as IPieceId,
        heapList: heapSet,
        recycleList: recycleSet,
        holdList: holdSet,
        maxAttempts: this.maxAttempts,
      });
    } else {
      this._batchGetter = new ReverseBatchGetter({
        firstCursor: firstCursor as IPieceId,
        lastCursor: lastCursor as IPieceId,
        heapList: heapSet,
        recycleList: recycleSet,
        holdList: holdSet,
        maxAttempts: this.maxAttempts,
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
    this._model.holdList = [ ...this._holdSet ];
    this._model.recycleList = [ ...this._recycleMap.entries() ];
    await this._model.save();
    const actualHeap = await this._getActualHeap();
    for (let i = 0; i < actualHeap.length; i++){
      const pieceId = actualHeap[i];
      this._heapSet.add(pieceId);
    }
  }

  private _getWhereOptions() :FindManyOptions<PieceEntity> {
    const from = this._from.id;
    const { firstCursor, lastCursor } = this._model;
    const pidCondition :FindOperator<any>[] = [];
    if (firstCursor >= 0) {
      pidCondition.push(LessThan(firstCursor));
    }
    if (lastCursor >= 0) {
      pidCondition.push(MoreThan(lastCursor));
    }
    const options :FindManyOptions<PieceEntity> = {
      select: [ 'pid' ],
      where: {
        from: {
          bid: from,
        } as any,
        createdAt: MoreThan(new Date(Date.now() - this.maxHistoryDepth)),
      },
      order: {
        pid: 'ASC',
      },
    };
    if (pidCondition.length) {
      (options.where as FindOptionsWhere<PieceEntity>).pid = pidCondition.length === 2 ? Or(...pidCondition) : pidCondition[0];
    }
    return options;
  }

  public async getBatch() :Promise<IPiece[]> {
    await this.make();
    if (!this._batchGetter) {
      return [];
    }
    let batch :IPieceId[];
    if (this._batchSize.isPercent) {
      batch = await this._getIdsByPercent();
    } else {
      batch = await this._getIdsByCount();
    }
    const pieces = await this._heap.find({
      select: [ 'pid', 'data' ],
      where: {
        pid: In(batch),
      },
    });
    return pieces.map(({ pid, data }) => ({ data, pid } as IPiece));
  }

  private async _getIdsByCount() :Promise<IPieceId[]> {
    const batch = this._batchGetter.getBatch(this._batchSize.size);
    if (batch.length < this._batchSize.size) {
      await this.sync();
      const addForBatch = this._batchGetter.getBatch(this._batchSize.size);
      batch.push(...addForBatch);
    }
    return batch;
  }

  private async _getIdsByPercent() :Promise<IPieceId[]> {
    let batch = this._batchGetter.getBatch(this.maximumAllocateBatchForPercent);
    if (batch.length === 0) {
      await this.sync();
      batch = this._batchGetter.getBatch(this.maximumAllocateBatchForPercent);
    }
    // then take a % and other items push to recycle without increment attempts
    const count = Math.ceil(batch.length * this._batchSize.size / 100);
    const output = batch.slice(0, count);
    const recycle = batch.slice(count);
    this._batchGetter.recycle(recycle, true);
    return output;
  }

  releaseBatch(pid :IPieceId[]) {
    this._batchGetter.release(pid);
  }

  failBatch(pid :IPieceId[]) {
    this._batchGetter.recycle(pid);
  }
}
