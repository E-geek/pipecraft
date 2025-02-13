import { Repository } from 'typeorm';
import { PieceEntity } from '@/db/entities/PieceEntity';
import { IPromise, promise, wait } from '@/parts/async';

export interface IThrottleStorePieces {
  /**
   * Union pieces for storing into the single batch
   * @param pieces
   * @param promises
   */
  store(pieces :PieceEntity[], promises :Promise<void>[]) :Promise<void>;
}

export class ThrottleStorePieces {
  private readonly _dropSize :number;
  private _pieceTimer :number = -1;
  private _repoPieces :Repository<PieceEntity>;
  private _piecesToStore :PieceEntity[];
  private _waitersToStore :IPromise<void>[];
  private _waiter :IPromise<void> | null = null;

  constructor(repoPieces :Repository<PieceEntity>, dropSize = 1000) {
    this._repoPieces = repoPieces;
    this._piecesToStore = [];
    this._waitersToStore = [];
    this._dropSize = dropSize;
  }

  public store(pieces :PieceEntity[], promises :Promise<void>[]) {
    if (pieces.length === 0) {
      return Promise.resolve();
    }
    this._piecesToStore.push(...pieces);
    const awaiter = promise<void>();
    this._waitersToStore.push(awaiter);
    promises.push(awaiter.promise);
    clearTimeout(this._pieceTimer);

    if (this._piecesToStore.length < this._dropSize) {
      this._pieceTimer = wait(0, this._drop.bind(this));
    } else {
      this._drop();
    }
    if (!this._waiter) {
      this._waiter = promise();
    }
    return this._waiter.promise;
  }

  private _drop() {
    const piecesToStore = this._piecesToStore.slice(0);
    const waiters = this._waitersToStore.slice(0);
    this._piecesToStore.length = 0;
    this._waitersToStore.length = 0;
    this
      ._repoPieces
      .save(piecesToStore)
      .then(() => {
        this._waiter?.done();
        this._waiter = null;
      })
      .then(() => {
        for (let i = 0; i < waiters.length; i++) {
          waiters[i].done();
        }
      });
  };
}
