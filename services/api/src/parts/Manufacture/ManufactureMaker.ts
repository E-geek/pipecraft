import { IBuildingTypes, Nullable } from '@pipecraft/types';
import { Repository } from 'typeorm';
import { BuildingEntity } from '@/db/entities/BuildingEntity';
import { PieceEntity } from '@/db/entities/PieceEntity';
import { PipeEntity } from '@/db/entities/PipeEntity';
import { ManufactureEntity } from '@/db/entities/ManufactureEntity';
import { RunReportEntity } from '@/db/entities/RunReportEntity';
import { IManufactureOnStorePieces, Manufacture } from '@/parts/Manufacture/Manufacture';
import { IPipe, Pipe } from '@/parts/Manufacture/Pipe';
import { Building, IBuilding } from '@/parts/Manufacture/Building';

export interface IBuildManufactureArgs {
  startBuildingId :bigint;
  buildingTypes :IBuildingTypes;
  onStorePieces :IManufactureOnStorePieces;
  repoPieces :Repository<PieceEntity>;
  repoBuildings :Repository<BuildingEntity>;
  repoPipes :Repository<PipeEntity>;
  repoRunReports :Repository<RunReportEntity>;
}

export interface ILoadManufactureArgs {
  repoPieces :Repository<PieceEntity>;
  repoRunReports :Repository<RunReportEntity>;
  manufactureModel :ManufactureEntity;
  buildingTypes :IBuildingTypes;
  onStorePieces :IManufactureOnStorePieces;
}

/**
 * Create and load manufactures
 */
export class ManufactureMaker {
  public static makeBuildingByModel(buildingModel :Nullable<BuildingEntity>, buildingTypes :IBuildingTypes) :IBuilding | Error {
    if (!buildingModel) {
      return Error('Building node error');
    }
    const descriptor = buildingTypes.get(buildingModel.type.moduleId);
    if (!descriptor) {
      return Error(`Descriptor for ${buildingModel.type.moduleId} does not exist`);
    }
    return new Building(buildingModel, descriptor);
  }

  /**
   * Build all manufacture object form miner and through all pipes to all buildings
   * This function most required for testing, in real live we are using `loadManufacture`
   * @param args :IBuildManufactureArgs
   * @returns Promise<Manufacture | Error>
   * @deprecated
   */
  public static async buildManufacture(args :IBuildManufactureArgs) :Promise<Manufacture | Error> {
    const {
      startBuildingId,
      buildingTypes,
      onStorePieces,
      repoPieces,
      repoBuildings,
      repoPipes,
      repoRunReports,
    } = args;
    const manufacture = new Manufacture({
      onStorePieces,
      repoPieces,
      repoRunReports,
    });
    const startBuildingModel = await repoBuildings.findOne({ where: { bid: startBuildingId }});
    const startBuilding = this.makeBuildingByModel(startBuildingModel, buildingTypes);
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
      const pipes = await repoPipes.find({
        where: [
          {
            from: {
              bid: currentBuildingId,
            },
          },
          {
            to: {
              bid: currentBuildingId,
            },
          },
        ],
      });
      for (const pipe of pipes) {
        if (registeredPipes.has(pipe.pmid)) {
          continue;
        }
        const buildingTo = pipe.to;
        const buildingFrom = pipe.from;
        for (const buildingTarget of [ buildingTo, buildingFrom ]) {
          if (!registeredBuildings.has(buildingTarget.bid)) {
            const currentBuilding = this.makeBuildingByModel(buildingTarget, buildingTypes);
            if (currentBuilding instanceof Error) {
              return currentBuilding;
            }
            manufacture.registerBuilding(currentBuilding);
            registeredBuildings.set(buildingTarget.bid, currentBuilding);
            buildingIdStack.push(pipe.to.bid);
          }
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
          heap: repoPieces,
        });
        manufacture.registerPipe(currentPipe);
        registeredPipes.set(pipe.pmid, currentPipe);
      }
    }
    await manufacture.make();
    return manufacture;
  }

  public static async loadManufacture(args :ILoadManufactureArgs) :Promise<Manufacture | Error> {
    const {
      manufactureModel,
      buildingTypes,
      repoPieces,
      repoRunReports,
      onStorePieces,
    } = args;
    const manufacture = new Manufacture({
      onStorePieces,
      repoPieces,
      repoRunReports,
      model : manufactureModel,
    });
    const buildingModels = manufactureModel.buildings;
    const pipeModels = manufactureModel.pipes;
    const buildingMap = new Map<bigint, IBuilding>();
    for (const buildingModel of buildingModels) {
      const building = this.makeBuildingByModel(buildingModel, buildingTypes);
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
        heap: repoPieces,
      });
      manufacture.registerPipe(pipe);
    }
    await manufacture.make();
    return manufacture;
  }
}
