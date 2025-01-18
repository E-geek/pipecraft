import { Repository } from 'typeorm';
import { IBuildingTypeDescriptor } from '@pipecraft/types';
import { ManufactureEntity } from '@/db/entities/ManufactureEntity';
import { PieceEntity } from '@/db/entities/PieceEntity';
import { ManufactureMaker } from '@/parts/Manufacture/ManufactureMaker';
import { Manufacture } from '@/parts/Manufacture/Manufacture';
import { IOnReceive } from '@/parts/Manufacture/IManufactureElement';
import { Loop } from '@/parts/Hub/Loop';

export interface IHub {

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
  }
}
