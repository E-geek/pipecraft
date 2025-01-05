import { IPieceId } from '@pipecraft/types';
import { PipeMemory } from '@/db/entities/PipeMemory';
import { IBuilding } from '@/manufacture/Building';
import { IManufactureElement } from '@/manufacture/IManufactureElement';

export interface IPipe extends IManufactureElement {
  from :IBuilding;
  to :IBuilding;
  getModel() :PipeMemory;
  getBatch() :any[];
  resolveBatch(pid :IPieceId[]) :void;
  type :'pipe';
}

export class Pipe implements IPipe {
  private _model :PipeMemory;
  private _from :IBuilding;
  private _to :IBuilding;

  public type :IPipe['type'] = 'pipe';

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
