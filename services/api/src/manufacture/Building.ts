import { IBuildingGear } from '@pipecraft/types';
import { Building as BuildingModel } from '@/db/entities/Building';
import { BuildingType } from '@/db/entities/BuildingType';
import { BuildingRunConfig } from '@/db/entities/BuildingRunConfig';

export interface IBuilding {
  readonly config :BuildingRunConfig;
  readonly batchSize :string;
  readonly typeTitle :string;
  getModel() :BuildingModel;
}

export class Building implements IBuilding {
  private readonly _model :BuildingModel;
  private readonly _type :BuildingType;
  private readonly _gear :IBuildingGear;
  public readonly config :BuildingRunConfig;

  constructor(building :BuildingModel, gear :IBuildingGear) {
    this._model = building;
    this._type = building.type;
    this._gear = gear;
    this.config = building.lastRunConfig;
  }

  getModel() :BuildingModel {
    return this._model;
  }

  get batchSize() {
    return this._model.batchSize;
  }

  get typeTitle() {
    return this._type.title;
  }
}

