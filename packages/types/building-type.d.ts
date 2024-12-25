import { Json } from "./json";

export type IBuildingTypeType = 'miner' | 'factory' | 'printer' | 'logic';

export interface IBuildingTypeMeta extends Json {
  type: IBuildingTypeType;
}

