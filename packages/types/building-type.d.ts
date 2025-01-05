import { MixedList } from 'typeorm/common/MixedList';
import { JsonMap } from './json';
import { IPiece, IPieceId } from './piece';
import { OrPromise } from './basic';
import { IBuildingMemory } from './building-memory';
import { IBuildingRunConfigMeta } from './building-run-config';
import { IBuildingMeta } from './building';

export type IBuildingTypeType = 'miner' | 'factory' | 'printer' | 'logic';

export interface IBuildingTypeMeta extends JsonMap {
  type :IBuildingTypeType; 
}

export interface IBuildingRunArgs<InputType = IPiece, OutputType = IPiece> {
  // function for push new pieces
  push :(pieces :OutputType[]) =>OrPromise<void>;
  // config for current runner from Building.meta
  buildingMeta :IBuildingMeta;
  // runConfig from BuildingRunConfig
  runConfig :IBuildingRunConfigMeta;
  // meta of the type
  typeMeta :IBuildingTypeMeta;
  // inputPieces
  input :InputType[];
}

export interface IBuildingRunResult {
  okResult :IPieceId[];
  errorResult ?:IPieceId[];
  errorLogs ?:string[];
}

export type IBuildingGear<InputType = IPiece, OutputType = IPiece> = (args :IBuildingRunArgs<InputType, OutputType>) =>Promise<IBuildingRunResult>;

export interface IBuildingTypeDescriptor<InputType = IPiece, OutputType = IPiece> {
  gear :IBuildingGear<InputType, OutputType>;
  memory ?:{
    entities :IBuildingMemory[];
    // eslint-disable-next-line @typescript-eslint/ban-types
    migrations ?:MixedList<Function | string>;
  }
}
