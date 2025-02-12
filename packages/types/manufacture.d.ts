import { JsonMap } from './json';

export interface IManufactureMeta extends JsonMap {
  isSequential :boolean; // should run all buildings only after prev. building is finished
}
