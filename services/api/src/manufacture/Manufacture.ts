import { IBuildingRunResult, IPieceMeta, Nullable } from '@pipecraft/types';
import { Manufacture as ManufactureModel } from '@/db/entities/Manufacture';
import { Building as BuildingModel } from '@/db/entities/Building';
import { IBuilding } from '@/manufacture/Building';
import { IPipe } from '@/manufacture/Pipe';

export interface IManufacture {
  buildings :IBuilding[];
  pipes :IPipe[];
  getModel() :Nullable<ManufactureModel>;
  setModel(model :ManufactureModel) :void;
  registerBuilding(building :IBuilding) :void;
  registerPipe(pipe :IPipe) :void;
  make() :Promise<void>;
  tick() :Promise<IBuildingRunResult | Error | null>;
  mining() :Promise<IBuildingRunResult>;
}

export type IManufactureOnReceive = (from :BuildingModel, pieces :IPieceMeta[]) =>Promise<any>;

export class Manufacture implements IManufacture {
  private _pipes :Set<IPipe>;
  private _buildings :Set<IBuilding>;
  private _cursor = 0;
  private _model :Nullable<ManufactureModel>;
  private _loop :(IPipe)[];
  private _onReceive :IManufactureOnReceive;

  constructor(onReceive :IManufactureOnReceive, model :Nullable<ManufactureModel> = null) {
    this._pipes = new Set();
    this._buildings = new Set();
    this._loop = [];
    this._model = model;
    this._onReceive = onReceive;
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
  async make() {
    this._loop.length = 0;
    const awaiterMakePipe :Promise<void>[] = [];
    for (const pipe of this._pipes) {
      awaiterMakePipe.push(pipe.make());
      this._loop.push(pipe);
    }
    await Promise.all(awaiterMakePipe);
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

  public async mining() :Promise<IBuildingRunResult> {
    const miners = this.buildings.filter(building => building.isMiner);
    const result :Required<IBuildingRunResult> = {
      okResult: [],
      errorLogs: [],
      errorResult: [],
    };
    for (const miner of miners) {
      const awaiterPieces :Promise<void>[] = [];
      const out = await miner.run((pieces) => {
        awaiterPieces.push(this._onReceive(miner.getModel(), pieces));
      });
      await Promise.allSettled(awaiterPieces);
      result.okResult.push(...out.okResult);
      if (out.errorLogs) {
        result.errorLogs.push(...out.errorLogs);
      }
      if (out.errorResult) {
        result.errorResult.push(...out.errorResult);
      }
    }
    return result;
  }

  private async pipeTick(pipe :IPipe) :Promise<IBuildingRunResult | null> {
    const to = pipe.to;
    const batch = await pipe.getBatch();
    if (batch.length === 0) {
      return null;
    }
    const awaiterPieces :Promise<void>[] = [];
    const res = await to.run((pieces) => {
      awaiterPieces.push(this._onReceive(to.getModel(), pieces));
    }, batch);
    await Promise.allSettled(awaiterPieces);
    pipe.releaseBatch(res.okResult);
    return res;
  }

  private _nullCursor = -1;

  public async tick() :Promise<IBuildingRunResult | Error | null> {
    const cursor = this._cursor++;
    if (this._nullCursor === cursor) {
      this._nullCursor = -1;
      return null;
    }
    if (this._cursor >= this._loop.length) {
      this._cursor = 0;
    }
    const element = this._loop[cursor];
    if (!element) {
      return new Error('No elements in loop, maybe `make` are skipped?');
    }
    if (element.type === 'pipe') {
      const result = await this.pipeTick(element);
      if (result === null) {
        if (this._nullCursor === -1) {
          this._nullCursor = cursor;
        }
        return this.tick();
      }
      this._nullCursor = -1;
      return result;
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
