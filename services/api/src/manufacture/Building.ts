import { Building as BuildingModel } from '@/db/entities/Building';
import { BuildingType } from '@/db/entities/BuildingType';
import { BuildingRunConfig } from '@/db/entities/BuildingRunConfig';

export interface IBuilding {
  readonly config :BuildingRunConfig;
  readonly batchSize :string;
  readonly typeTitle :string;
}

export class Building implements IBuilding {
  private _model :BuildingModel;
  private _type :BuildingType;
  public readonly config :BuildingRunConfig;

  constructor(building :BuildingModel) {
    this._model = building;
    this._type = building.type;
    this.config = building.lastRunConfig;
  }

  get batchSize() {
    return this._model.batchSize;
  }

  get typeTitle() {
    return this._type.title;
  }
}

