import { IPieceMeta } from '@pipecraft/types';
import { BuildingEntity } from '@/db/entities/BuildingEntity';
import { PieceEntity } from '@/db/entities/PieceEntity';

export interface IManufactureElement {
  type :unknown;
}

export type IOnReceive = (from :BuildingEntity, pieces :IPieceMeta[]) =>PieceEntity[];
