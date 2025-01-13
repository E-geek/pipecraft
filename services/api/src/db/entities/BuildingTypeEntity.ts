import { BaseEntity, Column, CreateDateColumn, Entity, Generated, PrimaryColumn } from 'typeorm';
import { IBuildingTypeMeta } from '@pipecraft/types';
import { valueTransformerBigint } from '../helpers/valueTransformerBigint';

@Entity({
  comment: 'Type of building',
  name: 'building_type',
})
export class BuildingTypeEntity extends BaseEntity {
  @Generated('increment')
  @PrimaryColumn({
    type: 'bigint',
    comment: 'type of the building',
    transformer: valueTransformerBigint,
  })
  btid :bigint;

  @CreateDateColumn()
  createdAt :Date;

  @Column({
    type: 'varchar',
    length: 128,
    nullable: false,
    comment: 'Title of the building type',
  })
  title :string;

  @Column({
    type: 'varchar',
    length: 256,
    nullable: false,
    comment: 'Module name of the building',
  })
  moduleId :string;

  @Column({
    type: 'jsonb',
    nullable: false,
    default: {},
    comment: 'Meta for the building instance',
  })
  meta :IBuildingTypeMeta;
}
