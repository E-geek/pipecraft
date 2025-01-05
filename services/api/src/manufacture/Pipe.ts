import { IPiece, IPieceId } from '@pipecraft/types';
import { And, FindManyOptions, FindOperator, LessThan, MoreThan, Or, Repository } from 'typeorm';
import { FindOptionsWhere } from 'typeorm/find-options/FindOptionsWhere';
import { IReturnedPieces, PipeMemory } from '@/db/entities/PipeMemory';
import { Piece } from '@/db/entities/Piece';
import { IBuilding } from '@/manufacture/Building';
import { IManufactureElement } from '@/manufacture/IManufactureElement';

export interface IPipe extends IManufactureElement {
  from :IBuilding;
  to :IBuilding;

  getModel() :PipeMemory;

  getBatch() :Promise<IPiece[]>;

  resolveBatch(pid :IPieceId[]) :void;

  type :'pipe';
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

  public type :IPipe['type'] = 'pipe';

  constructor({ pipeMemory, from, to, heap } :IPipeParams) {
    this._model = pipeMemory;
    this._from = from;
    this._to = to;
    this._heap = heap;
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

  private returnedToSet(returned :IReturnedPieces) :Set<IPieceId> {
    const result = new Set<IPieceId>();
    for (const [ pid, attempts ] of returned) {
      if (attempts < 5) {
        result.add(pid);
      }
    }
    return result;
  }

  private getWhereOptions(
    { ordering, firstCursor, lastCursor } :Pick<PipeMemory, 'ordering' | 'firstCursor' | 'lastCursor'>
  ) :FindManyOptions<Piece> {
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
          bid: this._from.id,
        },
        createdAt: MoreThan(new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 3)),
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
    const { ordering, firstCursor, lastCursor, reserved, returned } = this._model;
    // parse batchSize value
    const batchSizeRaw = this.to.batchSize;
    const isPercentSizeBatch = batchSizeRaw.endsWith('%');
    const batchSize = parseInt(batchSizeRaw, 10);
    // select list id allowed for process
    const returnedSet = this.returnedToSet(returned);
    const reservedSet = new Set<IPieceId>(reserved);
    const allowedForProcess = returnedSet.difference(reservedSet);
    // get all allowed pids outside of the cursors
    const options = this.getWhereOptions({ ordering, firstCursor, lastCursor });
    const piecesCut = await this._heap.find(options);
    const pids = piecesCut.map(({ pid }) => pid);
    const requiredPieces = !isPercentSizeBatch
      ? batchSize
      : Math.ceil((pids.length + allowedForProcess.size) * batchSize / 100);
    // assign pieceIds from allowed for process and returned pids and reserve this pids
    const result :IPieceId[] = [];
    if (ordering === 'direct') {
      for (const pid of allowedForProcess) {
        if (result.length >= requiredPieces) {
          break;
        }
        result.push(pid);
      }
    }
    if (result.length < requiredPieces) {
      const first = pids[0];
      let last = pids[0];
      for (const pid of pids) {
        if (result.length >= requiredPieces) {
          break;
        }
        last = pid;
        result.push(pid);
      }
      if (ordering === 'direct') {
        this._model.lastCursor = last;
      } else {
        const endRange = [ this._model.lastCursor, first ];
        const startRange = [ last, this._model.firstCursor ];
      }
    }
    return [];
  }

  resolveBatch(pid :IPieceId[]) {
  }
}
