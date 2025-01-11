import { MixedList } from 'typeorm/common/MixedList';
import { JsonMap } from './json';
import { IPiece, IPieceId, IPieceMeta } from './piece';
import { Promisable } from './basic';
import { IBuildingMemory } from './building-memory';
import { IBuildingRunConfigMeta } from './building-run-config';
import { IBuildingMeta } from './building';

export type IBuildingTypeType = 'miner' | 'factory' | 'printer' | 'logic';

export interface IBuildingTypeMeta extends JsonMap {
  type :IBuildingTypeType;
}

export type IBuildingPushFunction<OutputType = IPieceMeta> = (pieces :OutputType[]) =>Promisable<void>;

export interface IBuildingRunArgs<InputType = IPiece, OutputType = IPieceMeta> {
  // function for push new pieces
  push :IBuildingPushFunction<OutputType>;
  // config for current runner from Building.meta
  buildingMeta :IBuildingMeta;
  // runConfig from BuildingRunConfig
  runConfig :IBuildingRunConfigMeta;
  // meta of the type
  typeMeta :IBuildingTypeMeta;
  // inputPieces
  input :InputType[];
  // building id
  bid :bigint;
}

export interface IBuildingRunResult {
  okResult :IPieceId[];
  errorResult ?:IPieceId[];
  errorLogs ?:string[];
}

export type IBuildingGear<InputType = IPiece, OutputType = IPieceMeta> = (args :IBuildingRunArgs<InputType, OutputType>) =>Promise<IBuildingRunResult>;

export interface IBuildingTypeDescriptor<InputType = IPiece, OutputType = IPieceMeta> {
  gear :IBuildingGear<InputType, OutputType>;
  memory ?:{
    entities :IBuildingMemory[];
    // eslint-disable-next-line @typescript-eslint/ban-types
    migrations ?:MixedList<Function | string>;
  }
}
