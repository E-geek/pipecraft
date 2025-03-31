import { Injectable } from '@nestjs/common';
import { IBuildingTypes } from '@pipecraft/types';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ManufactureEntity } from '@/db/entities/ManufactureEntity';
import { PieceEntity } from '@/db/entities/PieceEntity';
import { RunReportEntity } from '@/db/entities/RunReportEntity';
import { BuildingEntity } from '@/db/entities/BuildingEntity';
import { Hub } from '@/parts/Hub/Hub';
import { BureauService } from '@/bureau/bureau.service';

@Injectable()
export class ManufactureService {
  // the Hub
  private readonly _hub :Hub;
  // list of all building types and his descriptors
  private _buildingTypes :IBuildingTypes = new Map();
  // building repo
  private readonly _repoBuildings :Repository<BuildingEntity  >;
  // manufacture repo
  private readonly _repoManufactures :Repository<ManufactureEntity>;
  // piece repo
  private readonly _repoPieces :Repository<PieceEntity>;
  // run report repo
  private readonly _repoRunReports :Repository<RunReportEntity>;

  constructor(
    private readonly _bureauService :BureauService,
    @InjectRepository(BuildingEntity) repoBuildings :Repository<BuildingEntity>,
    @InjectRepository(ManufactureEntity) repoManufactures :Repository<ManufactureEntity>,
    @InjectRepository(PieceEntity) repoPieces :Repository<PieceEntity>,
    @InjectRepository(RunReportEntity) repoRunReports :Repository<RunReportEntity>,
  ) {
    this._repoBuildings = repoBuildings;
    this._repoManufactures = repoManufactures;
    this._repoPieces = repoPieces;
    this._repoRunReports = repoRunReports;
    const buildingTypes = this._bureauService.getBuildingTypes();
    this._buildingTypes = buildingTypes;
    this._hub = new Hub({
      repoPieces,
      repoManufactures,
      repoRunReports,
      buildingTypes,
    });
  }


  public async addBuildingToQueue(bid :bigint, mid :bigint|null = null) {
    let manufactureId :bigint;
    if (mid) {
      manufactureId = mid;
    } else {
      const buildingEntity = await this._repoBuildings.findOne({ where: { bid }, relations: [ 'manufacture' ]});
      if (!buildingEntity) {
        throw new Error(`Building with ID ${bid} not found`);
      }
      if (!buildingEntity.manufacture) {
        throw new Error(`Building with ID ${bid} has no manufacture`);
      }
      manufactureId = buildingEntity.manufacture.mid;
    }
    const manufacture = this._hub.allManufactures.get(manufactureId);
    if (!manufacture) {
      throw new Error(`Manufacture with ID ${manufactureId} not found`);
    }
    const building = manufacture.getBuilding(bid);
    if (!building) {
      throw new Error(`Building with ID ${bid} not found in manufacture ${manufactureId}`);
    }
    if (building.isMiner) {
      this._hub.addBuildingToFacility(building);
    } else {
      const pipes = manufacture.getPipesTo(building);
      for (const pipe of pipes) {
        this._hub.addBuildingToFacility(building, pipe);
      }
    }
  }
}
