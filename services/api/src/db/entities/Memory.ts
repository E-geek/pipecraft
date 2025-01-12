import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Generated,
  PrimaryColumn,
  UpdateDateColumn
} from 'typeorm';
import { IBuildingMemory } from '@pipecraft/types';
import { valueTransformerBigint } from '../helpers/valueTransformerBigint';

export abstract class Memory extends BaseEntity implements IBuildingMemory {
  @Generated('increment')
  @PrimaryColumn({
    type: 'bigint',
    comment: 'id of the building',
    transformer: valueTransformerBigint,
  })
  mid :bigint;

  @Column({
    type: 'bigint',
    nullable: false,
    comment: 'id of the building',
    transformer: valueTransformerBigint,
  })
  bid :bigint;

  @CreateDateColumn()
  createdAt :Date;

  @UpdateDateColumn()
  updatedAt :Date;
}
