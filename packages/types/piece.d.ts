import { Json } from './json';
import { Opaque } from './basic';

export type IPiece = Json;

export type IPieceId = Opaque<bigint, 'id'>;
