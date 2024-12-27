import { Injectable } from '@nestjs/common';
import { Json, JsonMap } from '@pipecraft/types';

export interface IRunManufactureOptions extends JsonMap {
  config :Json;
}

@Injectable()
export class ManufactureService {
  public startFromMining(minerId :bigint, options :IRunManufactureOptions){}
}
