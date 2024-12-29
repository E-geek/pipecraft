import { BaseEntity } from 'typeorm';

export abstract class IBuildingMemory extends BaseEntity {
  mid :bigint;
  bid :bigint;
  createdAt :Date;
  updatedAt :Date;
}
