import { IBuilding } from '@/manufacture/Building';
import { IPipe } from '@/manufacture/Pipe';

export interface IManufacture {
  buildings :IBuilding[];
  pipes :IPipe[];
}

export class Manufacture implements IManufacture {
  private _pipes :IPipe[];
  private _buildings :IBuilding[];

  public get buildings() {
    return [ ...this._buildings ];
  }

  public get pipes() {
    return [ ...this._pipes ];
  }
}
