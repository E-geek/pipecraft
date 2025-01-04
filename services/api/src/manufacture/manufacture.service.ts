import { Injectable } from '@nestjs/common';
import { IBuildingTypeDescriptor, Json, JsonMap, Nullable } from '@pipecraft/types';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Manufacture } from '@/manufacture/Manufacture';
import { Building as BuildingModel } from '@/db/entities/Building';
import { PipeMemory as PipeModel } from '@/db/entities/PipeMemory';
import { Manufacture as ManufactureModel } from '@/db/entities/Manufacture';
import { IPipe, Pipe } from '@/manufacture/Pipe';
import { Building, IBuilding } from '@/manufacture/Building';

export interface IRunManufactureOptions extends JsonMap {
  config :Json;
}

@Injectable()
export class ManufactureService {
  private _buildingTypes :Map<string, IBuildingTypeDescriptor> = new Map();

  private readonly _repoBuildings :Repository<BuildingModel>;

  private readonly _repoPipeMemories :Repository<PipeModel>;

  private readonly _repoManufactures :Repository<ManufactureModel>;

  constructor(
    @InjectRepository(BuildingModel) repoBuildings :Repository<BuildingModel>,
    @InjectRepository(PipeModel) repoPipeMemories :Repository<PipeModel>,
    @InjectRepository(ManufactureModel) repoManufactures :Repository<ManufactureModel>,
  ) {
    this._repoBuildings = repoBuildings;
    this._repoPipeMemories = repoPipeMemories;
    this._repoManufactures = repoManufactures;
  }

  public startFromMining(minerId :bigint, options :IRunManufactureOptions) {
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
    const manufacture = new Manufacture();
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
        const currentPipe = new Pipe(pipe, from, to);
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
      manufacture.make();
    }
    model.title = title ?? model.title;
    const waiter = [];
    waiter.push(this._repoManufactures.save(model));
    for (const building of model.buildings) {
      waiter.push(this._repoBuildings.save(building));
    }
    for (const pipe of model.pipes) {
      waiter.push(this._repoPipeMemories.save(pipe));
    }
    await Promise.all(waiter);
    return model.mid;
  }
}
