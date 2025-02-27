import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { IBuildingRunConfigMeta } from '@pipecraft/types';
import { valueTransformerBigint } from '../helpers/valueTransformerBigint';
import { BuildingEntity } from './BuildingEntity';
import { RunReportEntity } from './RunReportEntity';

@Entity({
  comment: 'This table stores the run configuration for a building run',
  name: 'building_run_config',
})
export class BuildingRunConfigEntity extends BaseEntity {
  constructor(props ?:Partial<BuildingRunConfigEntity>) {
    super();
    Object.assign(this, props);
  }
  @Generated('increment')
  @PrimaryColumn({
    type: 'bigint',
    comment: 'id and default ordering key',
    transformer: valueTransformerBigint,
  })
  brcid :bigint;

  @ManyToOne(() => BuildingEntity, (building) => building.runConfig, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'NO ACTION',
  })
  building :BuildingEntity;

  @OneToMany(() => RunReportEntity, runReport => runReport.buildingRunConfig, {
    nullable: true,
    onDelete: 'CASCADE',
    onUpdate: 'NO ACTION',
  })
  runReport :RunReportEntity[];

  @Column({
    type: 'jsonb',
    nullable: false,
    default: {},
  })
  runConfig :IBuildingRunConfigMeta;

  @CreateDateColumn()
  createdAt :Date;
}
