import { Injectable } from '@nestjs/common';
import { IBuildingTypes } from '@pipecraft/types';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ManufactureEntity } from '@/db/entities/ManufactureEntity';
import { PieceEntity } from '@/db/entities/PieceEntity';
import { RunReportEntity } from '@/db/entities/RunReportEntity';
import { Hub } from '@/parts/Hub/Hub';
import { BureauService } from '@/bureau/bureau.service';

@Injectable()
export class ManufactureService {
  private _buildingTypes :IBuildingTypes = new Map();

  private readonly _repoManufactures :Repository<ManufactureEntity>;
  //piece repo
  private readonly _repoPieces :Repository<PieceEntity>;

  private readonly _repoRunReports :Repository<RunReportEntity>;

  private readonly _hub :Hub;

  constructor(
    private readonly _bureauService :BureauService,
    @InjectRepository(ManufactureEntity) repoManufactures :Repository<ManufactureEntity>,
    @InjectRepository(PieceEntity) repoPieces :Repository<PieceEntity>,
    @InjectRepository(RunReportEntity) repoRunReports :Repository<RunReportEntity>,
  ) {
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


  public addBuildingToQueue(mid :bigint, bid :bigint) :void {
    // todo
  }
}
