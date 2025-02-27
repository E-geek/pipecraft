import { MixedList } from 'typeorm/common/MixedList';
import { Repository } from 'typeorm';
import { BaseDataSourceOptions } from 'typeorm/data-source/BaseDataSourceOptions';
import { JsonMap } from './json';
import { IPiece, IPieceId, IPieceMeta } from './piece';
import { Constructor, Promisable } from './basic';
import { IBuildingMemory } from './building-memory';
import { IBuildingRunConfigMeta } from './building-run-config';
import { IBuildingMeta } from './building';

export type IBuildingTypeType = 'miner' | 'factory' | 'printer' | 'logic';

export interface IBuildingTypeMeta extends JsonMap {
  type :IBuildingTypeType;
  isExclusive ?:boolean;
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
  // Memory tables with store order in description. Each record has a Repository class and Table class
  memory :[Repository<IBuildingMemory>, Constructor<IBuildingMemory>][];
}

export type IBuildingLogLevel = 'LOG' | 'DEBUG' | 'WARN' | 'ERROR' | 'FATAL';

export interface IBuildingReturnLogRecord {
  message :string;
  pids ?:IPieceId[]; // possible not set
  level ?:IBuildingLogLevel; // default is 'LOG'
}

export interface IBuildingRunResult {
  okResult :IPieceId[];
  errorResult ?:IPieceId[];
  logs ?:IBuildingReturnLogRecord[];
}

export type IBuildingGear<InputType = IPiece, OutputType = IPieceMeta> = (args :IBuildingRunArgs<InputType, OutputType>) =>Promisable<IBuildingRunResult>;

export interface IBuildingTypeDescriptor<InputType = IPiece, OutputType = IPieceMeta> {
  gear :IBuildingGear<InputType, OutputType>;
  memory ?:{
    entities :Constructor<IBuildingMemory>[];
    // eslint-disable-next-line @typescript-eslint/ban-types
    migrations ?:MixedList<Function | string>;
  }
}

export interface IBuildingTypeExport<InputType = IPiece, OutputType = IPieceMeta> extends Pick<BaseDataSourceOptions, 'entities' | 'migrations'>{
  title :string; // title for DB
  descriptor :IBuildingTypeDescriptor<InputType, OutputType>;
}
