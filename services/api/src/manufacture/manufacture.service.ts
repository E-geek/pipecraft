import { Injectable } from '@nestjs/common';
import { IBuildingTypeDescriptor, Json, JsonMap } from '@pipecraft/types';

export interface IRunManufactureOptions extends JsonMap {
  config :Json;
}

@Injectable()
export class ManufactureService {
  public startFromMining(minerId :bigint, options :IRunManufactureOptions){}

  public async registerBuildingType(type :string, descriptor :IBuildingTypeDescriptor) :Promise<void>{

  }

  public hasBuildingType(type :string){
    return false;
  }
}
