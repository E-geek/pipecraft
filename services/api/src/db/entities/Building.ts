import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { IBuildingMeta } from '@pipecraft/types';
import { BuildingType } from './BuildingType';
import { BuildingRunConfig } from './BuildingRunConfig';

@Entity({
  comment: 'Data of build: miner, factory, printer, etc...'
})
export class Building {
  @PrimaryGeneratedColumn('increment', {
    type: 'bigint',
    comment: 'id of the building'
  })
  bid :bigint;

  @ManyToOne(() => Building, build => build.output, {
    nullable: true,
    lazy: true,
    cascade: true,
  })
  input :Building | null;

  @OneToMany(() => Building, build => build.input, {
    nullable: true,
    lazy: true,
    cascade: true,
  })
  output :Building[] | null;

  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: '1',
    comment: 'N parts, N% of ready parts, 0 or 0% - infinite',
  })
  batchSize :string;

  @Column({
    type: 'jsonb',
    nullable: false,
    default: {},
  })
  meta :IBuildingMeta;

  @ManyToOne(() => BuildingType, {
    nullable: false,
    lazy: false,
    cascade: true,
    onDelete: 'CASCADE',
    onUpdate: 'NO ACTION',
  })
  type :BuildingType;

  @OneToMany(() => BuildingRunConfig, buildRunConfig => buildRunConfig.building, {
    nullable: true,
    lazy: true,
    cascade: true,
  })
  runConfig :BuildingRunConfig[];

  get lastRunConfig() {
    return this.runConfig[this.runConfig.length - 1];
  }

  @CreateDateColumn()
  createdAt :Date;
}
