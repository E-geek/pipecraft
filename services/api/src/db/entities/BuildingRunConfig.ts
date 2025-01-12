import {
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
import { Building } from './Building';
import { RunReport } from './RunReport';

@Entity({
  comment: 'This table stores the run configuration for a building run'
})
export class BuildingRunConfig {
  @Generated('increment')
  @PrimaryColumn({
    type: 'bigint',
    comment: 'id and default ordering key',
    transformer: valueTransformerBigint,
  })
  brcid :bigint;

  @ManyToOne(() => Building, (building) => building.runConfig)
  building :Building;

  @OneToMany(() => RunReport, runReport => runReport.buildingRunConfig, {
    nullable: true,
    lazy: true,
    cascade: true,
  })
  runReport :Promise<RunReport[]>;

  @Column({
    type: 'jsonb',
    nullable: false,
    default: {},
  })
  runConfig :IBuildingRunConfigMeta;

  @CreateDateColumn()
  createdAt :Date;
}
