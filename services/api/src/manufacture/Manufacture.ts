import { IBuildingRunResult, Nullable } from '@pipecraft/types';
import { IBuilding } from '@/manufacture/Building';
import { IPipe } from '@/manufacture/Pipe';
import { Manufacture as ManufactureModel } from '@/db/entities/Manufacture';

export interface IManufacture {
  buildings :IBuilding[];
  pipes :IPipe[];
  getModel() :Nullable<ManufactureModel>;
  setModel(model :ManufactureModel) :void;
  registerBuilding(building :IBuilding) :void;
  registerPipe(pipe :IPipe) :void;
  make() :void;
}

export class Manufacture implements IManufacture {
  private _pipes :Set<IPipe>;
  private _buildings :Set<IBuilding>;
  private _cursor = 0;
  private _model :Nullable<ManufactureModel>;
  private _loop :(IPipe|IBuilding)[];

  constructor(model :Nullable<ManufactureModel> = null) {
    this._pipes = new Set();
    this._buildings = new Set();
    this._loop = [];
    this._model = model;
  }

  getModel() {
    return this._model;
  }

  setModel(model :ManufactureModel) {
    this._model = model;
  }

  registerBuilding(building :IBuilding) {
    this._buildings.add(building);
  }

  registerPipe(pipe :IPipe) {
    this._pipes.add(pipe);
  }

  /**
   * after registration every building and pipe create loop of pipes and miners
   * - and -
   * setup model of manufacture BUT NOT SAVE IT
   */
  make() {
    this._loop.length = 0;
    this._loop.push(...this.buildings.filter(building => building.isMiner));
    for (const pipe of this._pipes) {
      this._loop.push(pipe);
    }
    if (!this._model) {
      return;
    }
    this._model.pipes = [];
    for (const pipe of this._pipes) {
      const model = pipe.getModel();
      model.manufacture = Promise.resolve(this._model);
      this._model.pipes.push(model);
    }
    this._model.buildings = [];
    for (const building of this._buildings) {
      const model = building.getModel();
      model.manufacture = Promise.resolve(this._model);
      this._model.buildings.push(model);
    }
  }

  private minerTick(miner :IBuilding) {
    return { okResult: []};
  }

  private pipeTick(pipe :IPipe) {
    return { okResult: []};
  }

  public async tick() :Promise<IBuildingRunResult | Error> {
    const element = this._loop[this._cursor];
    if (!element) {
      return new Error('No elements in loop, maybe `make` are skipped?');
    }
    if (element.type === 'building') {
      return this.minerTick(element);
    }
    if (element.type === 'pipe') {
      return this.pipeTick(element);
    }
    return { okResult: []};
  }

  public get buildings() {
    return [ ...this._buildings ];
  }

  public get pipes() {
    return [ ...this._pipes ];
  }
}
