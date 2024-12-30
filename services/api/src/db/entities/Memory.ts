import { BaseEntity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { IBuildingMemory } from '@pipecraft/types';

export abstract class Memory extends BaseEntity implements IBuildingMemory {
  @PrimaryGeneratedColumn('increment', {
    type: 'bigint',
    comment: 'id of the building'
  })
  mid :bigint;

  @Column({
    type: 'bigint',
    nullable: false,
    comment: 'id of the building'
  })
  bid :bigint;

  @Column()
  createdAt :Date;

  @Column()
  updatedAt :Date;
}
