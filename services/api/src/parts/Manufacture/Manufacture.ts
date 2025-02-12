import { IBuildingRunResult, IPiece, Nullable } from '@pipecraft/types';
import { Repository } from 'typeorm';
import { ManufactureEntity } from '@/db/entities/ManufactureEntity';
import { PieceEntity } from '@/db/entities/PieceEntity';
import { IBuilding } from '@/parts/Manufacture/Building';
import { IPipe } from '@/parts/Manufacture/Pipe';
import { IOnReceive } from '@/parts/Manufacture/IManufactureElement';

export interface IManufacture {
  readonly id :bigint;
  readonly buildings :IBuilding[];
  readonly pipes :IPipe[];
  readonly isSequential :boolean;
  isActive :boolean;
  getModel() :Nullable<ManufactureEntity>;
  setModel(model :ManufactureEntity) :void;
  registerBuilding(building :IBuilding) :void;
  registerPipe(pipe :IPipe) :void;
  make() :Promise<void>;
  tick() :Promise<IBuildingRunResult | Error | null>;
  mining(minerId ?:bigint) :Promise<IBuildingRunResult>;
  pipeTick(pipe :IPipe) :Promise<IBuildingRunResult | null>;
  pipeTickWithBatch(pipe :IPipe, batch :IPiece[]) :Promise<IBuildingRunResult | null>;
}

export type IManufactureOnReceive = IOnReceive;

export class Manufacture implements IManufacture {
  private _pipes :Set<IPipe>;
  private _buildings :Set<IBuilding>;
  private _cursor = 0;
  private _model :Nullable<ManufactureEntity>;
  private _loop :(IPipe)[];
  private _onReceive :IManufactureOnReceive;
  private _repoPieces :Repository<PieceEntity>;

  public isActive = false;

  constructor(onReceive :IManufactureOnReceive, repoPieces :Repository<PieceEntity>, model :Nullable<ManufactureEntity> = null) {
    this._pipes = new Set();
    this._buildings = new Set();
    this._loop = [];
    this._model = model;
    this._onReceive = onReceive;
    this._repoPieces = repoPieces;
  }

  public get id() {
    return this._model?.mid || -1n;
  }

  public getModel() {
    return this._model;
  }

  public setModel(model :ManufactureEntity) {
    this._model = model;
  }

  public registerBuilding(building :IBuilding) {
    this._buildings.add(building);
  }

  public registerPipe(pipe :IPipe) {
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
      model.manufacture = this._model;
      this._model.pipes.push(model);
    }
    this._model.buildings = [];
    for (const building of this._buildings) {
      const model = building.getModel();
      model.manufacture = this._model;
      this._model.buildings.push(model);
    }
  }

  public async mining(minerId ?:bigint) :Promise<IBuildingRunResult> {
    const miners = this.buildings.filter(building =>
      building.isMiner && (!minerId || building.id === minerId)
    );
    const result :Required<IBuildingRunResult> = {
      okResult: [],
      errorLogs: [],
      errorResult: [],
      addNewPieces: 0,
    };
    for (const miner of miners) {
      const piecesToStore :PieceEntity[] = [];
      const out = await miner.run((pieces) => {
        piecesToStore.push(...this._onReceive(miner.getModel(), pieces));
      });
      await this._repoPieces.save(piecesToStore);
      result.addNewPieces += out.addNewPieces;
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

  public async pipeTick(pipe :IPipe) :Promise<IBuildingRunResult | null> {
    const batch = await pipe.getBatch();
    if (batch.length === 0) {
      return null;
    }
    return this.pipeTickWithBatch(pipe, batch);
  }

  public async pipeTickWithBatch(pipe :IPipe, batch :IPiece[]) :Promise<IBuildingRunResult | null> {
    const to = pipe.to;
    const piecesToStore :PieceEntity[] = [];
    const res = await to.run((pieces) => {
      piecesToStore.push(...this._onReceive(to.getModel(), pieces));
    }, batch);
    await this._repoPieces.save(piecesToStore);
    pipe.releaseBatch(res.okResult);
    if (res.errorResult?.length) {
      pipe.failBatch(res.errorResult);
    }
    res.addNewPieces = batch.length;
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
    return { okResult: [], addNewPieces: 0 };
  }

  public get buildings() {
    return [ ...this._buildings ];
  }

  public get pipes() {
    return [ ...this._pipes ];
  }

  public get isSequential() :boolean {
    return this._model?.meta.isSequential || false;
  }
}
