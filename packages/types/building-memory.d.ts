import { type BaseEntity } from 'typeorm';

export interface IBuildingMemory extends BaseEntity {
  mid :bigint;
  bid :bigint;
  createdAt :Date;
  updatedAt :Date;
}
