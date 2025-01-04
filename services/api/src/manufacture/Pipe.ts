import { IPieceId } from '@pipecraft/types';
import { PipeMemory } from '@/db/entities/PipeMemory';
import { IBuilding } from '@/manufacture/Building';

export interface IPipe {
  from :IBuilding;
  to :IBuilding;
  getModel() :PipeMemory;
  getBatch() :any[];
  resolveBatch(pid :IPieceId[]) :void;
}

export class Pipe implements IPipe {
  private _model :PipeMemory;
  private _from :IBuilding;
  private _to :IBuilding;

  constructor(pipeMemory :PipeMemory, from :IBuilding, to :IBuilding) {
    this._model = pipeMemory;
    this._from = from;
    this._to = to;
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

  getBatch() {
    return [];
  }

  resolveBatch(pid :IPieceId[]) {
  }
}
