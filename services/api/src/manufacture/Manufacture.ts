import { IBuilding } from '@/manufacture/Building';
import { IPipe } from '@/manufacture/Pipe';

export interface IManufacture {
  buildings :IPipe[];
  pipes :IBuilding[];
}

export class Manufacture implements IManufacture {
  private _pipes :IBuilding[];
  private _buildings :IPipe[];

  public get buildings() {
    return [ ...this._buildings ];
  }

  public get pipes() {
    return [ ...this._pipes ];
  }
}
