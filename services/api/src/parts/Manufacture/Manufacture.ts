import { IBuildingPushFunction, IBuildingRunResult, IPiece, IPieceMeta, Nullable, Promisable } from '@pipecraft/types';
import { Repository } from 'typeorm';
import { ManufactureEntity } from '@/db/entities/ManufactureEntity';
import { PieceEntity } from '@/db/entities/PieceEntity';
import { BuildingEntity } from '@/db/entities/BuildingEntity';
import { IBuilding } from '@/parts/Manufacture/Building';
import { IPipe } from '@/parts/Manufacture/Pipe';
import { ThrottleStorePieces } from '@/parts/ThrottleStorePieces/ThrottleStorePieces';

export interface IManufacture {
  readonly id :bigint;
  readonly buildings :IBuilding[];
  readonly pipes :IPipe[];
  readonly isSequential :boolean;
  readonly nice :number;
  isActive :boolean;

  getModel() :Nullable<ManufactureEntity>;

  setModel(model :ManufactureEntity) :void;

  registerBuilding(building :IBuilding) :void;

  registerPipe(pipe :IPipe) :void;

  make() :Promise<void>;

  mining(minerId ?:bigint) :Promise<IBuildingRunResult>;

  pipeTick(pipe :IPipe) :Promise<IBuildingRunResult | null>;

  pipeTickWithBatch(pipe :IPipe, batch :IPiece[]) :Promise<IBuildingRunResult | null>;

  getPipesFrom(building :IBuilding) :IPipe[];
}

export type IManufactureOnStorePieces = (building :IBuilding) =>Promisable<void>;

export class Manufacture implements IManufacture {
  private _pipes :Set<IPipe>;
  private _buildings :Set<IBuilding>;
  private _model :Nullable<ManufactureEntity>;
  private _loop :(IPipe)[];
  private _onStorePieces :IManufactureOnStorePieces;
  private _repoPieces :Repository<PieceEntity>;

  public isActive = false;
  private _throttleStorePieces :ThrottleStorePieces;

  constructor(onStorePieces :IManufactureOnStorePieces, repoPieces :Repository<PieceEntity>, model :Nullable<ManufactureEntity> = null) {
    this._pipes = new Set();
    this._buildings = new Set();
    this._loop = [];
    this._model = model;
    this._onStorePieces = onStorePieces;
    this._repoPieces = repoPieces;
    this._throttleStorePieces = new ThrottleStorePieces(repoPieces);
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
    building.manufacture = this;
    this._buildings.add(building);
  }

  public registerPipe(pipe :IPipe) {
    pipe.manufacture = this;
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
    };
    for (const miner of miners) {
      const minerEntity = miner.getModel();
      const promises :Promise<void>[] = [];
      const out = await miner.run(this._onPush(promises, minerEntity, miner));
      await Promise.all(promises);
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

  private _onPush(promises :Promise<void>[], buildingEntity :BuildingEntity, building :IBuilding) :IBuildingPushFunction {
    return (pieces :IPieceMeta[]) => {
      if (!pieces.length) {
        return;
      }
      const pieceEntities = pieces.map(piece => new PieceEntity({
        from: buildingEntity,
        data: piece,
      }));
      this
        ._throttleStorePieces
        .store(pieceEntities, promises)
        .then(() => {
          this._onStorePieces(building);
        })
      ;
    };
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
    const promises :Promise<void>[] = [];
    const buildingEntity = to.getModel();
    const res = await to.run(
      this._onPush(promises, buildingEntity, to),
      batch,
    );
    await this._repoPieces.save(piecesToStore);
    pipe.releaseBatch(res.okResult);
    if (res.errorResult?.length) {
      pipe.failBatch(res.errorResult);
    }
    return res;
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

  public get nice() :number {
    return this._model?.nice || 0;
  }

  public getPipesFrom(building :IBuilding) :IPipe[] {
    // can be optimised
    return [ ...this._pipes ].filter(pipe => pipe.from === building);
  }
}
