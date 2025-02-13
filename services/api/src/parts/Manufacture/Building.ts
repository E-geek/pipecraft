import {
  Constructor,
  IBuildingGear, IBuildingMemory,
  IBuildingPushFunction,
  IBuildingRunResult,
  IBuildingTypeDescriptor,
  IPiece, Nullable,
} from '@pipecraft/types';
import { BaseEntity, Repository } from 'typeorm';
import { BuildingTypeEntity } from '@/db/entities/BuildingTypeEntity';
import { BuildingRunConfigEntity } from '@/db/entities/BuildingRunConfigEntity';
import { BuildingEntity } from '@/db/entities/BuildingEntity';
import { IManufactureElement } from '@/parts/Manufacture/IManufactureElement';
import { IManufacture } from '@/parts/Manufacture/Manufacture';

export type IBuildingState = 'idle' | 'wait' | 'work';

export interface IBuilding extends IManufactureElement {
  type :'building';
  readonly id :bigint;
  readonly config :BuildingRunConfigEntity;
  readonly batchSize :string;
  readonly typeTitle :string;
  readonly isMiner :boolean;
  readonly isWorks :boolean;
  readonly buildingTypeId :bigint;
  readonly isExclusiveBuildingType :boolean;
  readonly nice :number;
  readonly state :IBuildingState;
  getModel() :BuildingEntity;
  run(push :IBuildingPushFunction, input ?:IPiece[]) :Promise<IBuildingRunResult>;
  setState(state :IBuildingState) :void;
  manufacture ?:Nullable<IManufacture>;
}

export class Building implements IBuilding {
  private readonly _model :BuildingEntity;
  private readonly _type :BuildingTypeEntity;
  private readonly _gear :IBuildingGear;
  private _isWorks = false;
  private _memory :[Repository<IBuildingMemory>, Constructor<IBuildingMemory>][];
  public readonly config :BuildingRunConfigEntity;

  public type :IBuilding['type'] = 'building';
  public _state :IBuildingState = 'idle';
  public manufacture :Nullable<IManufacture> = null;

  constructor(building :BuildingEntity, descriptor :IBuildingTypeDescriptor) {
    this._model = building;
    this._type = building.type;
    this._gear = descriptor.gear;
    this.config = building.lastRunConfig;
    if (descriptor.memory?.entities.length) {
      this._memory = descriptor.memory.entities.slice().map((classObject) => {
        return [ (classObject as unknown as typeof BaseEntity).getRepository() as Repository<IBuildingMemory>, classObject ];
      });
    } else {
      this._memory = [];
    }
  }

  public async run(push :IBuildingPushFunction, input :IPiece[] = []) :Promise<IBuildingRunResult> {
    this._isWorks = true;
    try {
      let addNewPieces = 0;
      const pushTo :IBuildingPushFunction = (pieces) => {
        addNewPieces += pieces.length;
        return push(pieces);
      };
      const res =  await this._gear({
        input,
        push: pushTo,
        runConfig: this._model.lastRunConfig.runConfig,
        typeMeta: this._type.meta,
        buildingMeta: this._model.meta,
        bid: this._model.bid,
        memory: this._memory,
      });
      return {
        ...res,
        addNewPieces,
      } as IBuildingRunResult;
    } catch (error) {
      console.error(`Run building ${this._model.bid} error:`, (error as Error).message);
      return {
        okResult: [],
        errorResult: input.map(({ pid }) => pid),
        errorLogs: [ (error as Error).message ],
      };
    }
  }

  getModel() :BuildingEntity {
    return this._model;
  }

  get id() {
    return this._model.bid;
  }

  get batchSize() {
    return this._model.batchSize;
  }

  get typeTitle() {
    return this._type.title;
  }

  get isMiner() :boolean {
    return this._type.meta.type === 'miner';
  }

  get isWorks() :boolean {
    return this._isWorks;
  }

  get buildingTypeId() :bigint {
    return this._type.btid;
  }

  get isExclusiveBuildingType() :boolean {
    return this._type.meta.isExclusive || false;
  }

  get nice() :number {
    return this._model.nice ?? this.manufacture?.nice ?? 0;
  }

  get state() :IBuildingState {
    return this._state;
  }

  public setState(state :IBuildingState) { // сеттер так отличается, чтобы быть видимым экшеном
    this._state = state;
  }
}

