import { Injectable } from '@nestjs/common';
import { IBuildingRunConfigMeta, IBuildingTypeDescriptor, IPieceMeta } from '@pipecraft/types';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BuildingEntity } from '@/db/entities/BuildingEntity';
import { PipeEntity } from '@/db/entities/PipeEntity';
import { ManufactureEntity } from '@/db/entities/ManufactureEntity';
import { PieceEntity } from '@/db/entities/PieceEntity';
import { BuildingRunConfigEntity } from '@/db/entities/BuildingRunConfigEntity';
import { Manufacture } from '@/parts/Manufacture/Manufacture';

export interface IRunManufactureOptions {
  runConfig ?:IBuildingRunConfigMeta;
}

@Injectable()
export class ManufactureService {
  private _buildingTypes :Map<string, IBuildingTypeDescriptor> = new Map();

  private readonly _repoBuildings :Repository<BuildingEntity>;

  private readonly _repoBuildingRunConfigs :Repository<BuildingRunConfigEntity>;

  private readonly _repoPipeMemories :Repository<PipeEntity>;

  private readonly _repoManufactures :Repository<ManufactureEntity>;
  //piece repo
  private readonly _repoPieces :Repository<PieceEntity>;

  constructor(
    @InjectRepository(BuildingEntity) repoBuildings :Repository<BuildingEntity>,
    @InjectRepository(PipeEntity) repoPipeMemories :Repository<PipeEntity>,
    @InjectRepository(ManufactureEntity) repoManufactures :Repository<ManufactureEntity>,
    @InjectRepository(PieceEntity) repoPieces :Repository<PieceEntity>,
    @InjectRepository(BuildingRunConfigEntity) repoBuildingRunConfigs :Repository<BuildingRunConfigEntity>,
  ) {
    this._repoBuildings = repoBuildings;
    this._repoPipeMemories = repoPipeMemories;
    this._repoManufactures = repoManufactures;
    this._repoPieces = repoPieces;
    this._repoBuildingRunConfigs = repoBuildingRunConfigs;
  }

  private onReceive = (from :BuildingEntity, pieces :IPieceMeta[]) :PieceEntity[] => {
    const toStoreList :PieceEntity[] = [];
    for (const data of pieces) {
      const pieceModel = new PieceEntity({ from, data });
      toStoreList.push(pieceModel);
    }
    return toStoreList;
  };

  private async _setupRunConfigOnDemand(building :BuildingEntity, runConfig :IBuildingRunConfigMeta) {
    const lastConfig = building.lastRunConfig?.runConfig ?? {};
    // deep compare and if different then create new config
    if (JSON.stringify(lastConfig) === JSON.stringify(runConfig)) {
      return;
    }
    const newConfig = new BuildingRunConfigEntity();
    newConfig.runConfig = runConfig;
    newConfig.building = building;
    await this._repoBuildingRunConfigs.save(newConfig, { reload: true });
    await building.reload();
  }

  public async startFromMining(minerId :bigint, options :IRunManufactureOptions) {
    // rework
  }

  public async registerBuildingType(type :string, descriptor :IBuildingTypeDescriptor) :Promise<void> {
    if (this.hasBuildingType(type)) {
      throw new Error('Building type already exists');
    }
    this._buildingTypes.set(type, descriptor);
  }

  public hasBuildingType(type :string) {
    return this._buildingTypes.has(type);
  }

  public unregisterBuildingType(type :string) {
    this._buildingTypes.delete(type);
  }

  public clearBuildingTypes() {
    this._buildingTypes.clear();
  }

  public buildManufacture(startBuildingId :bigint)  {
    // rework
  }

  public async storeManufacture(manufacture :Manufacture, title ?:string) :Promise<bigint> {
    let model = manufacture.getModel();
    if (!model) {
      model = new ManufactureEntity();
      manufacture.setModel(model);
      await manufacture.make();
    }
    model.title = title ?? model.title;
    await this._repoManufactures.save(model);
    return model.mid;
  }

  public async loadManufacture(manufactureModel :ManufactureEntity)  {
    // rework
  }
}
