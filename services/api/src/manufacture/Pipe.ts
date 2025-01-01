import { IPieceId } from '@pipecraft/types';
import { PipeMemory } from '@/db/entities/PipeMemory';
import { Building, IBuilding } from '@/manufacture/Building';

export interface IPipe {
  from :IBuilding;
  to :IBuilding;
  getBatch() :any[];
  resolveBatch(pid :IPieceId[]) :void;
}

export class Pipe implements IPipe {
  private _model :PipeMemory;
  private _from :IBuilding;
  private _to :IBuilding;

  constructor(pipeMemory :PipeMemory, from ?:IBuilding, to ?:IBuilding) {
    this._model = pipeMemory;
    this._from = from ?? new Building(pipeMemory.from);
    this._to = to ?? new Building(pipeMemory.to);
  }

  get from() {
    return this._from;
  }

  get to() {
    return this._to;
  }

  getBatch() {
    return [];
  }

  resolveBatch(pid :IPieceId[]) {
  }
}
