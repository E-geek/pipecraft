import { IBuilding } from '@/manufacture/Building';
import { IPipe } from '@/manufacture/Pipe';

export interface IManufacture {
  buildings :IBuilding[];
  pipes :IPipe[];
  registerBuilding(building :IBuilding) :void;
  registerPipe(pipe :IPipe) :void;
  make() :void;
}

export class Manufacture implements IManufacture {
  private _pipes :Set<IPipe>;
  private _buildings :Set<IBuilding>;
  private _cursor = 0;
  private _loop :IPipe[];

  constructor() {
    this._pipes = new Set();
    this._buildings = new Set();
    this._loop = [];
  }

  registerBuilding(building :IBuilding) {
    this._buildings.add(building);
  }

  registerPipe(pipe :IPipe) {
    this._pipes.add(pipe);
  }

  // after registration every building and pipe create loop of pipes
  make() {
    for (const pipe of this._pipes) {
      this._loop.push(pipe);
    }
  }

  public get buildings() {
    return [ ...this._buildings ];
  }

  public get pipes() {
    return [ ...this._pipes ];
  }
}
