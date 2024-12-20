import { Json } from '@pipecraft/types';
import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
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

  @ManyToOne(() => Building, (building) => building.lastRunConfig)
  building :Building;

  @OneToMany(() => RunReport, runReport => runReport.buildingRunConfig, {
    nullable: true,
    lazy: true,
    cascade: true,
  })
  runReport :RunReport[];

  @Column({
    type: 'jsonb',
    nullable: false,
    default: {},
  })
  runConfig :Json;

  @CreateDateColumn()
  createdAt :Date;
}
