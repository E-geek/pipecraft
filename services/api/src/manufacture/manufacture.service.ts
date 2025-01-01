import { Injectable } from '@nestjs/common';
import { IBuildingTypeDescriptor, Json, JsonMap } from '@pipecraft/types';
import { Manufacture } from '@/manufacture/Manufacture';

export interface IRunManufactureOptions extends JsonMap {
  config :Json;
}

@Injectable()
export class ManufactureService {
  private _buildingTypes :Map<string, IBuildingTypeDescriptor> = new Map();

  public startFromMining(minerId :bigint, options :IRunManufactureOptions){}

  public async registerBuildingType(type :string, descriptor :IBuildingTypeDescriptor) :Promise<void>{
    if(this.hasBuildingType(type)){
      throw new Error('Building type already exists');
    }
    this._buildingTypes.set(type, descriptor);
  }

  public hasBuildingType(type :string){
    return this._buildingTypes.has(type);
  }

  public unregisterBuildingType(type :string){
    this._buildingTypes.delete(type);
  }

  public clearBuildingTypes() {
    this._buildingTypes.clear();
  }

  public async buildManufacture(startBuildingId :bigint) :Promise<Manufacture>{
    return new Manufacture();
  }
}
