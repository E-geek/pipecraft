import { Json } from './json';
import { Opaque } from './basic';

export type IPieceMeta = Json;

export type IPieceId = Opaque<bigint, 'id'>;

export interface IPiece<Meta extends IPieceMeta = Json> {
  pid :IPieceId;
  data :Meta;
}
