import { Injectable } from '@nestjs/common';
import { IBuildingRunConfigMeta, IBuildingTypeDescriptor, IPieceMeta, Nullable } from '@pipecraft/types';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Building as BuildingModel } from '@/db/entities/Building';
import { PipeMemory as PipeModel } from '@/db/entities/PipeMemory';
import { Manufacture as ManufactureModel } from '@/db/entities/Manufacture';
import { Piece as PieceModel } from '@/db/entities/Piece';
import { BuildingRunConfig } from '@/db/entities/BuildingRunConfig';
import { Manufacture } from '@/manufacture/Manufacture';
import { IPipe, Pipe } from '@/manufacture/Pipe';
import { Building, IBuilding } from '@/manufacture/Building';

export interface IRunManufactureOptions {
  runConfig ?:IBuildingRunConfigMeta;
}

@Injectable()
export class ManufactureService {
  private _buildingTypes :Map<string, IBuildingTypeDescriptor> = new Map();

  private readonly _repoBuildings :Repository<BuildingModel>;

  private readonly _repoBuildingRunConfigs :Repository<BuildingRunConfig>;

  private readonly _repoPipeMemories :Repository<PipeModel>;

  private readonly _repoManufactures :Repository<ManufactureModel>;
  //piece repo
  private readonly _repoPieces :Repository<PieceModel>;

  constructor(
    @InjectRepository(BuildingModel) repoBuildings :Repository<BuildingModel>,
    @InjectRepository(PipeModel) repoPipeMemories :Repository<PipeModel>,
    @InjectRepository(ManufactureModel) repoManufactures :Repository<ManufactureModel>,
    @InjectRepository(PieceModel) repoPieces :Repository<PieceModel>,
    @InjectRepository(BuildingRunConfig) repoBuildingRunConfigs :Repository<BuildingRunConfig>,
  ) {
    this._repoBuildings = repoBuildings;
    this._repoPipeMemories = repoPipeMemories;
    this._repoManufactures = repoManufactures;
    this._repoPieces = repoPieces;
    this._repoBuildingRunConfigs = repoBuildingRunConfigs;
  }

  private onReceive = (from :BuildingModel, pieces :IPieceMeta[]) :PieceModel[] => {
    const toStoreList :PieceModel[] = [];
    for (const piece of pieces) {
      const pieceModel = new PieceModel(from, piece);
      toStoreList.push(pieceModel);
    }
    return toStoreList;
  };

  private async _setupRunConfigOnDemand(building :BuildingModel, runConfig :IBuildingRunConfigMeta) {
    const lastConfig = building.lastRunConfig?.runConfig ?? {};
    // deep compare and if different then create new config
    if (JSON.stringify(lastConfig) === JSON.stringify(runConfig)) {
      return;
    }
    const newConfig = new BuildingRunConfig();
    newConfig.runConfig = runConfig;
    newConfig.building = building;
    await this._repoBuildingRunConfigs.save(newConfig, { reload: true });
    await building.reload();
  }

  public async startFromMining(minerId :bigint, options :IRunManufactureOptions) {
    const miner = await this._repoBuildings.findOne({ where:{ bid: minerId }});
    if (!miner) {
      return Error('Miner not found');
    }
    if (options.runConfig) {
      await this._setupRunConfigOnDemand(miner, options.runConfig);
    }
    const manufactureModel = await miner.manufacture;
    let manufacture :Manufacture;
    if (!manufactureModel) {
      const manufactureOrError = await this.buildManufacture(minerId);
      if (manufactureOrError instanceof Error) {
        return manufactureOrError;
      }
      manufacture = manufactureOrError;
    } else {
      const manufactureOrError = await this.loadManufacture(manufactureModel);
      if (manufactureOrError instanceof Error) {
        return manufactureOrError;
      }
      manufacture = manufactureOrError;
    }
    await manufacture.mining();
    let i = 0;
    while (i < 10000) {
      const result = await manufacture.tick();
      if (result instanceof Error) {
        return result;
      }
      if (result === null) {
        break;
      }
      i++;
    }
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

  private makeBuildingByModel(buildingModel :Nullable<BuildingModel>) :IBuilding | Error {
    if (!buildingModel) {
      return Error('Building node error');
    }
    const descriptor = this._buildingTypes.get(buildingModel.type.moduleId);
    if (!descriptor) {
      return Error(`Descriptor for ${buildingModel.type.moduleId} does not exist`);
    }
    return new Building(buildingModel, descriptor.gear);
  }

  public async buildManufacture(startBuildingId :bigint) :Promise<Manufacture | Error> {
    const manufacture = new Manufacture(this.onReceive, this._repoPieces);
    const startBuildingModel = await this._repoBuildings.findOne({ where: { bid: startBuildingId }});
    const startBuilding = this.makeBuildingByModel(startBuildingModel);
    if (startBuilding instanceof Error) {
      return startBuilding;
    }
    if (!startBuildingModel) {
      return Error('Building node error');
    }
    manufacture.registerBuilding(startBuilding);
    let i = 0;
    const registeredPipes = new Map<bigint, IPipe>();
    const registeredBuildings = new Map<bigint, IBuilding>([[ startBuildingModel.bid, startBuilding ]]);
    const buildingIdStack = [ startBuildingModel.bid ];
    while (i++ < 2000) {
      const currentBuildingId = buildingIdStack.pop();
      if (!currentBuildingId) {
        break;
      }
      const pipes = await this._repoPipeMemories.find({
        where: {
          from: {
            bid: currentBuildingId,
          }
        },
      });
      for (const pipe of pipes) {
        if (registeredPipes.has(pipe.pmid)) {
          continue;
        }
        const buildingTo = pipe.to;
        if (!registeredBuildings.has(buildingTo.bid)) {
          const currentBuilding = this.makeBuildingByModel(buildingTo);
          if (currentBuilding instanceof Error) {
            return currentBuilding;
          }
          manufacture.registerBuilding(currentBuilding);
          registeredBuildings.set(buildingTo.bid, currentBuilding);
          buildingIdStack.push(pipe.to.bid);
        }
        const from = registeredBuildings.get(pipe.from.bid);
        const to = registeredBuildings.get(pipe.to.bid);
        if (!from || !to) {
          return Error(`Building for pipe ${pipe.pmid} not exists ${pipe.from.bid} -> ${pipe.to.bid};\
            Problem with ${from ? '' : 'from'}${!from && !to ? ', ' : ''}${to ? '' : 'to'}`);
        }
        const currentPipe = new Pipe({
          pipeMemory: pipe,
          from,
          to,
          heap: this._repoPieces,
        });
        manufacture.registerPipe(currentPipe);
        registeredPipes.set(pipe.pmid, currentPipe);
      }
    }
    manufacture.make();
    return manufacture;
  }

  public async storeManufacture(manufacture :Manufacture, title ?:string) :Promise<bigint> {
    let model = manufacture.getModel();
    if (!model) {
      model = new ManufactureModel();
      manufacture.setModel(model);
      await manufacture.make();
    }
    model.title = title ?? model.title;
    await this._repoManufactures.save(model);
    return model.mid;
  }

  public async loadManufacture(manufactureModel :ManufactureModel) :Promise<Manufacture | Error> {
    const manufacture = new Manufacture(this.onReceive, this._repoPieces, manufactureModel);
    const buildingModels = manufactureModel.buildings;
    const pipeModels = manufactureModel.pipes;
    const buildingMap = new Map<bigint, IBuilding>();
    for (const buildingModel of buildingModels) {
      const building = this.makeBuildingByModel(buildingModel);
      if (building instanceof Error) {
        return building;
      }
      manufacture.registerBuilding(building);
      buildingMap.set(buildingModel.bid, building);
    }
    for (const pipeModel of pipeModels) {
      const from = buildingMap.get(pipeModel.from.bid);
      const to = buildingMap.get(pipeModel.to.bid);
      if (!from || !to) {
        return Error(`Building for pipe ${pipeModel.pmid} not exists ${pipeModel.from.bid} -> ${pipeModel.to.bid};\
          Problem with ${from ? '' : 'from'}${!from && !to ? ', ' : ''}${to ? '' : 'to'}`);
      }
      const pipe = new Pipe({
        pipeMemory: pipeModel,
        from,
        to,
        heap: this._repoPieces,
      });
      manufacture.registerPipe(pipe);
    }
    await manufacture.make();
    return manufacture;
  }
}
