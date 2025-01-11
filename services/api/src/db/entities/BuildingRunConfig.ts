import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { IBuildingRunConfigMeta } from '@pipecraft/types';
import { Building } from './Building';
import { RunReport } from './RunReport';

@Entity({
  comment: 'This table stores the run configuration for a building run'
})
export class BuildingRunConfig {
  @PrimaryGeneratedColumn('increment', {
    type: 'bigint',
    comment: 'id and default ordering key'
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
