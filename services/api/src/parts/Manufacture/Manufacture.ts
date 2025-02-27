import { IBuildingPushFunction, IBuildingRunResult, IPiece, IPieceMeta, Nullable, Promisable } from '@pipecraft/types';
import { Repository } from 'typeorm';
import { ManufactureEntity } from '@/db/entities/ManufactureEntity';
import { PieceEntity } from '@/db/entities/PieceEntity';
import { BuildingEntity } from '@/db/entities/BuildingEntity';
import { IQuasiReportEntity, RunReportEntity } from '@/db/entities/RunReportEntity';
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

  isBuildingCanFacility(building :IBuilding) :boolean;
}

export type IManufactureOnStorePieces = (building :IBuilding) =>Promisable<void>;

interface IManufactureArgs {
  onStorePieces :IManufactureOnStorePieces;
  repoPieces :Repository<PieceEntity>;
  repoRunReports :Repository<RunReportEntity>;
  model ?:Nullable<ManufactureEntity>;
}

export class Manufacture implements IManufacture {
  private _pipes :Set<IPipe>;
  private _buildings :Map<bigint, IBuilding>;
  private _model :Nullable<ManufactureEntity>;
  private _loop :(IPipe)[];
  private _onStorePieces :IManufactureOnStorePieces;
  private _repoPieces :Repository<PieceEntity>;
  private _repoRunReport :Repository<RunReportEntity>;

  public isActive = false;
  private _throttleStorePieces :ThrottleStorePieces;
  private _buildingOrder :bigint[];

  constructor({ onStorePieces, repoPieces, repoRunReports, model=null } :IManufactureArgs) {
    this._pipes = new Set();
    this._buildings = new Map();
    this._loop = [];
    this._buildingOrder = [];
    this._model = model;
    this._onStorePieces = onStorePieces;
    this._repoPieces = repoPieces;
    this._repoRunReport = repoRunReports;
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
    this._buildings.set(building.id, building);
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
    for (const building of this._buildings.values()) {
      const model = building.getModel();
      model.manufacture = this._model;
      this._model.buildings.push(model);
    }
    // create network for isSequential case
    this._makeBuildingOrder();
  }

  private _makeBuildingOrder() {
    const fromTo = new Map<bigint, bigint[]>();
    for(const pipe of this._pipes) {
      const from = pipe.from.id;
      const to = pipe.to.id;
      const ids = fromTo.get(from) ?? [];
      ids.push(to);
      if (ids.length === 1) {
        fromTo.set(from, ids);
      }
    }
    const miners = this.buildings.filter(building => building.isMiner);
    const orderSet = new Set<bigint>(miners.map(miner => miner.id));
    for (const miner of miners) {
      this._makeBuildingOrderFromMiner(miner.id, orderSet, fromTo);
    }
    this._buildingOrder = [ ...orderSet ];
  }

  private _makeBuildingOrderFromMiner(minerId :bigint, orderSet :Set<bigint>, fromToMap :Map<bigint, bigint[]>) {
    const checkedBids = new Set<bigint>([ minerId ]);
    const bids = [ minerId ];
    let i = -1;
    while (i++ < 1000) {
      const bid = bids[i];
      if (bid == null) {
        break;
      }
      const toIds = fromToMap.get(bid) ?? [];
      for (let i1 = 0; i1 < toIds.length; i1++){
        const toId = toIds[i1];
        if (checkedBids.has(toId)) {
          continue;
        }
        checkedBids.add(toId);
        orderSet.add(toId);
        bids.push(toId);
      }
    }
  }

  public async mining(minerId ?:bigint) :Promise<IBuildingRunResult> {
    const miners = this.buildings.filter(building =>
      building.isMiner && (!minerId || building.id === minerId)
    );
    const result :Required<IBuildingRunResult> = {
      okResult: [],
      logs: [],
      errorResult: [],
    };
    for (const miner of miners) {
      const minerEntity = miner.getModel();
      const promises :Promise<void>[] = [];
      const res = await miner.run(this._onPush(promises, minerEntity, miner));
      await Promise.all(promises);
      if (res.logs?.length) {
        const runReports = RunReportEntity.prepare(res.logs.map((report) => ({
          ...report,
          bid: miner.id,
          runConfig: miner.getModel().lastRunConfig,
        } as IQuasiReportEntity)));
        await this._repoRunReport.save(runReports);
      }
      result.okResult.push(...res.okResult);
      if (res.logs) {
        result.logs.push(...res.logs);
      }
      if (res.errorResult) {
        result.errorResult.push(...res.errorResult);
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
    if (res.logs?.length) {
      const runReports = RunReportEntity.prepare(res.logs.map((report) => ({
        ...report,
        bid: to.id,
        runConfig: to.getModel().lastRunConfig,
      } as IQuasiReportEntity)));
      await this._repoRunReport.save(runReports);
    }
    pipe.releaseBatch(res.okResult);
    if (res.errorResult?.length) {
      pipe.failBatch(res.errorResult);
    }
    return res;
  }

  public get buildings() {
    return [ ...this._buildings.values() ];
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

  public isBuildingCanFacility(building :IBuilding) :boolean {
    if (building.manufacture !== this) {
      return false;
    }
    if (building.state === 'suspend') {
      return false;
    }
    if (this.isSequential) {
      const order = this._buildingOrder;
      for (let i = 0; i < order.length; i++) {
        const buildingId = order[i];
        const candidateBuilding = this._buildings.get(buildingId);
        if (!candidateBuilding) {
          return false;
        }
        if (candidateBuilding.state === 'work' || candidateBuilding.state === 'wait') {
          return candidateBuilding === building;
        }
      }
      return true;
    }
    return true;
  }
}
