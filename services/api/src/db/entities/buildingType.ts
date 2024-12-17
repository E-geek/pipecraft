import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { IBuildingTypeMeta } from '@pipecraft/types';

@Entity({
  comment: 'Type of building'
})
export class BuildingType {
  @PrimaryGeneratedColumn('increment', {
    type: 'bigint',
    comment: 'type of the building'
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
