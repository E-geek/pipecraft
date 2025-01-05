import { IBuildingGear, IBuildingPushFunction, IBuildingRunResult, IPiece } from '@pipecraft/types';
import { Building as BuildingModel } from '@/db/entities/Building';
import { BuildingType } from '@/db/entities/BuildingType';
import { BuildingRunConfig } from '@/db/entities/BuildingRunConfig';
import { IManufactureElement } from '@/manufacture/IManufactureElement';

export interface IBuilding extends IManufactureElement {
  type :'building';
  readonly id :bigint;
  readonly config :BuildingRunConfig;
  readonly batchSize :string;
  readonly typeTitle :string;
  readonly isMiner :boolean;
  getModel() :BuildingModel;
  run(push :IBuildingPushFunction, input ?:IPiece[]) :Promise<IBuildingRunResult>;
}

export class Building implements IBuilding {
  private readonly _model :BuildingModel;
  private readonly _type :BuildingType;
  private readonly _gear :IBuildingGear;
  public readonly config :BuildingRunConfig;

  public type :IBuilding['type'] = 'building';

  constructor(building :BuildingModel, gear :IBuildingGear) {
    this._model = building;
    this._type = building.type;
    this._gear = gear;
    this.config = building.lastRunConfig;
  }

  public run(push :IBuildingPushFunction, input :IPiece[] = []) :Promise<IBuildingRunResult> {
    return this._gear({
      input,
      push,
      runConfig: this._model.lastRunConfig.runConfig,
      typeMeta: this._type.meta,
      buildingMeta: this._model.meta,
    });
  }

  getModel() :BuildingModel {
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

  get isMiner() {
    return this._type.meta.type === 'miner';
  }
}

