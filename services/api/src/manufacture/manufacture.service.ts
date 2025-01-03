import { Injectable } from '@nestjs/common';
import { IBuildingTypeDescriptor, Json, JsonMap } from '@pipecraft/types';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Manufacture } from '@/manufacture/Manufacture';
import { Building as BuildingModel } from '@/db/entities/Building';
import { PipeMemory as PipeModel } from '@/db/entities/PipeMemory';
import { Pipe } from '@/manufacture/Pipe';
import { Building } from '@/manufacture/Building';

export interface IRunManufactureOptions extends JsonMap {
  config :Json;
}

@Injectable()
export class ManufactureService {
  private _buildingTypes :Map<string, IBuildingTypeDescriptor> = new Map();

  private readonly _repoBuildings :Repository<BuildingModel>;

  private readonly _repoPipeMemories :Repository<PipeModel>;

  constructor(
    @InjectRepository(BuildingModel) repoBuildings :Repository<BuildingModel>,
    @InjectRepository(PipeModel) repoPipeMemories :Repository<PipeModel>,
  ) {
    this._repoBuildings = repoBuildings;
    this._repoPipeMemories = repoPipeMemories;
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

  public async buildManufacture(startBuildingId :bigint) :Promise<Manufacture | Error> {
    const manufacture = new Manufacture();
    const startBuilding = await this._repoBuildings.findOne({ where: { bid: startBuildingId }});
    if (!startBuilding) {
      return Error('Building node error');
    }
    manufacture.registerBuilding(new Building(startBuilding));
    let i = 0;
    const registeredPipes = new Set<PipeModel>();
    const registeredBuildings = new Set<BuildingModel>([ startBuilding ]);
    const buildingStack = [ startBuilding ];
    while (i++ < 200) {
      const currentBuilding = buildingStack.pop();
      if (!currentBuilding) {
        break;
      }
      const pipes = await this._repoPipeMemories.find({
        where: {
          from: {
            bid: currentBuilding.bid,
          }
        },
      });
      for (const pipe of pipes) {
        if (registeredPipes.has(pipe)) {
          continue;
        }
        manufacture.registerPipe(new Pipe(pipe));
        if (!registeredBuildings.has(pipe.to)) {
          manufacture.registerBuilding(new Building(pipe.to));
          buildingStack.push(pipe.to);
        }
      }
    }
    manufacture.make();
    return manufacture;
  }
}
