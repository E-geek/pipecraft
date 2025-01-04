import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { IBuildingMeta, Nullable } from '@pipecraft/types';
import { BuildingType } from './BuildingType';
import { BuildingRunConfig } from './BuildingRunConfig';
import { Scheduler } from './Scheduler';
import { User } from './User';
import { Manufacture } from './Manufacture';

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
  })
  input :Promise<Building | null>;

  @OneToMany(() => Building, build => build.input, {
    nullable: true,
    lazy: true,
  })
  output :Promise<Building[] | null>;

  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: '1',
    comment: 'N parts, N% of ready parts, 0 or 0% - infinite',
  })
  batchSize :string;

  @ManyToOne(() => Manufacture, manufacture => manufacture.buildings, {
    nullable: true,
    lazy: true,
    cascade: false,
    onDelete: 'SET NULL',
  })
  manufacture :Promise<Nullable<Manufacture>>;

  @Column({
    type: 'jsonb',
    nullable: false,
    default: {},
  })
  meta :IBuildingMeta;

  @ManyToOne(() => BuildingType, {
    nullable: false,
    eager: true,
    cascade: true,
    onDelete: 'CASCADE',
    onUpdate: 'NO ACTION',
  })
  type :BuildingType;

  @OneToMany(() => BuildingRunConfig, buildRunConfig => buildRunConfig.building, {
    nullable: true,
    eager: true,
    cascade: true,
  })
  runConfig :BuildingRunConfig[];

  get lastRunConfig() {
    return this.runConfig[this.runConfig.length - 1];
  }

  @OneToOne(() => Scheduler, scheduler => scheduler.building, {
    nullable: true,
    cascade: false,
  })
  scheduler :Scheduler;

  @ManyToOne(() => User, {
    nullable: false,
    cascade: true,
  })
  owner :User;

  @CreateDateColumn()
  createdAt :Date;

  @UpdateDateColumn()
  updatedAt :Date;
}
