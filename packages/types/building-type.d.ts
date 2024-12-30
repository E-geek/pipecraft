import { Json } from './json';
import { MixedList } from 'typeorm/common/MixedList';
import { IPiece, IPieceId } from './piece';
import { OrPromise } from './basic';
import { IBuildingMemory } from './building-memory';
import { IBuildingRunConfigMeta } from './building-run-config';
import { IBuildingMeta } from './building';

export type IBuildingTypeType = 'miner' | 'factory' | 'printer' | 'logic';

export interface IBuildingTypeMeta extends Json {
  type :IBuildingTypeType; 
}

export interface IBuildingRunArgs {
  // function for push new pieces
  push :(pieces :IPiece[]) =>OrPromise<void>;
  // config for current runner from Building.meta
  buildingMeta :IBuildingMeta;
  // runConfig from BuildingRunConfig
  runConfig :IBuildingRunConfigMeta;
  // meta of the type
  typeMeta :IBuildingTypeMeta;
  // inputPieces
  input :IPiece[];
}

export interface IBuildingRunResult {
  okResult :IPieceId[];
  errorResult ?:IPieceId[];
  errorLogs ?:string[];
}

export interface IBuildingTypeDescriptor {
  runner :(args :IBuildingRunArgs) =>Promise<IBuildingRunResult>;
  memory ?:{
    entities :IBuildingMemory[];
    // eslint-disable-next-line @typescript-eslint/ban-types
    migrations ?:MixedList<Function | string>;
  }
}
