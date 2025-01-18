import { Repository } from 'typeorm';
import { IBuildingTypeDescriptor } from '@pipecraft/types';
import { ManufactureEntity } from '@/db/entities/ManufactureEntity';
import { PieceEntity } from '@/db/entities/PieceEntity';
import { ManufactureMaker } from '@/parts/Manufacture/ManufactureMaker';
import { Manufacture } from '@/parts/Manufacture/Manufacture';
import { IOnReceive } from '@/parts/Manufacture/IManufactureElement';
import { Loop } from '@/parts/Hub/Loop';

export interface IHub {
  /**
   * Loading all manufactures to the memory
   * All manufactures after loading is inactive and not in loop
   */
  loadAllManufactures :() =>Promise<IHub | Error>;

  /**
   * check every pipe in every manufacture for possible to process data
   * if even one pipe can process data then manufacture will add to loop
   */
  activateManufacturesOnDemand :() =>Promise<IHub | Error>;

  /**
   * Function for call from custom run and scheduler
   * Inside run only miner and if miner to mine then manufacture will be added to loop
   * @param minerEntity
   */
  runMiner :(minerEntity :ManufactureEntity) =>Promise<IHub | Error>;

  /**
   * start processing for all factory, printers and other buildings **except** miners
   */
  startLoop :() =>IHub;

  /**
   * pause working the loop
   */
  pauseLoop :() =>IHub;
}

export interface IHubArgs {
  repoPieces :Repository<PieceEntity>;
  repoManufacture :Repository<ManufactureEntity>;
  buildingTypes :Map<string, IBuildingTypeDescriptor>;
  onReceive :IOnReceive;
}

export class Hub implements IHub {
  private _manufactures :Map<bigint, Manufacture>;
  private _repoManufacture :Repository<ManufactureEntity>;
  private _repoPieces :Repository<PieceEntity>;
  private _buildingTypes :Map<string, IBuildingTypeDescriptor>;
  private _onReceive :IOnReceive;
  private _manufactureLoop :Loop<Manufacture>;

  constructor(args :IHubArgs) {
    this._repoManufacture = args.repoManufacture;
    this._repoPieces = args.repoPieces;
    this._buildingTypes = args.buildingTypes;
    this._onReceive = args.onReceive;
    this._manufactures = new Map();
  }

  private _onManufactureReceive = (manufactureEntity :ManufactureEntity) :IOnReceive => (buildingEntity, pieces) => {
    if (pieces.length > 0) {
      const manufacture = this._manufactures.get(manufactureEntity.mid)!;
      if (!this._manufactureLoop.has(manufacture)) {
        this._manufactureLoop.add(manufacture);
      }
    }
    return this._onReceive(buildingEntity, pieces);
  };

  public async loadAllManufactures() {
    const manufactureEntities = await this._repoManufacture.findBy({});
    for (const entity of manufactureEntities) {
      const manufacture = await ManufactureMaker.loadManufacture({
        manufactureModel: entity,
        onReceive: this._onManufactureReceive(entity),
        repoPieces: this._repoPieces,
        buildingTypes: this._buildingTypes,
      });
      if (manufacture instanceof Error) {
        return new Error(`Failed to load manufacture: ${manufacture.message}`);
      }
      this._manufactures.set(entity.mid, manufacture);
    }
    return this;
  }

  public async activateManufacturesOnDemand() {
    return this;
  }

  public async runMiner(minerEntity :ManufactureEntity) {
    return this;
  }

  public startLoop() {
    return this;
  }

  public pauseLoop() {
    return this;
  }
}
