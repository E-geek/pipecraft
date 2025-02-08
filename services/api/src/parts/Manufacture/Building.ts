import { IBuildingGear, IBuildingPushFunction, IBuildingRunResult, IPiece } from '@pipecraft/types';
import { BuildingTypeEntity } from '@/db/entities/BuildingTypeEntity';
import { BuildingRunConfigEntity } from '@/db/entities/BuildingRunConfigEntity';
import { BuildingEntity } from '@/db/entities/BuildingEntity';
import { IManufactureElement } from '@/parts/Manufacture/IManufactureElement';

export interface IBuilding extends IManufactureElement {
  type :'building';
  readonly id :bigint;
  readonly config :BuildingRunConfigEntity;
  readonly batchSize :string;
  readonly typeTitle :string;
  readonly isMiner :boolean;
  readonly isWorks :boolean;
  getModel() :BuildingEntity;
  run(push :IBuildingPushFunction, input ?:IPiece[]) :Promise<IBuildingRunResult>;
}

export class Building implements IBuilding {
  private readonly _model :BuildingEntity;
  private readonly _type :BuildingTypeEntity;
  private readonly _gear :IBuildingGear;
  private _isWorks = false;
  public readonly config :BuildingRunConfigEntity;

  public type :IBuilding['type'] = 'building';

  constructor(building :BuildingEntity, gear :IBuildingGear) {
    this._model = building;
    this._type = building.type;
    this._gear = gear;
    this.config = building.lastRunConfig;
  }

  public async run(push :IBuildingPushFunction, input :IPiece[] = []) :Promise<IBuildingRunResult> {
    this._isWorks = true;
    try {
      return await this._gear({
        input,
        push,
        runConfig: this._model.lastRunConfig.runConfig,
        typeMeta: this._type.meta,
        buildingMeta: this._model.meta,
        bid: this._model.bid,
      });
    } catch (error) {
      console.error(`Run building ${this._model.bid} error:`, (error as Error).message);
      return {
        okResult: [],
        errorResult: input.map(({ pid }) => pid),
        errorLogs: [ (error as Error).message ],
      };
    }
  }

  getModel() :BuildingEntity {
    return this._model;
  }

  get id() {
    return this._model.bid;
  }

  get batchSize() {
    return this._model.batchSize;
  }

  get typeTitle() {
    return this._type.title;
  }

  get isMiner() :boolean {
    return this._type.meta.type === 'miner';
  }

  get isWorks() :boolean {
    return this._isWorks;
  }
}

