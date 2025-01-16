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
  })
  building :Promise<BuildingEntity> | BuildingEntity;

  @OneToMany(() => RunReportEntity, runReport => runReport.buildingRunConfig, {
    nullable: true,
    lazy: true,
    onDelete: 'CASCADE',
  })
  runReport :Promise<RunReportEntity[]>;

  @Column({
    type: 'jsonb',
    nullable: false,
    default: {},
  })
  runConfig :IBuildingRunConfigMeta;

  @CreateDateColumn()
  createdAt :Date;
}
