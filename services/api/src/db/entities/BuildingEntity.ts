import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity, Generated,
  ManyToOne,
  OneToMany,
  OneToOne, PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IBuildingMeta, Nullable } from '@pipecraft/types';
import { valueTransformerBigint } from '../helpers/valueTransformerBigint';
import { BuildingTypeEntity } from './BuildingTypeEntity';
import { BuildingRunConfigEntity } from './BuildingRunConfigEntity';
import { SchedulerEntity } from './SchedulerEntity';
import { UserEntity } from './UserEntity';
import { ManufactureEntity } from './ManufactureEntity';

@Entity({
  comment: 'Data of build: miner, factory, printer, etc...',
  name: 'building',
})
export class BuildingEntity extends BaseEntity {
  @Generated('increment')
  @PrimaryColumn({
    type: 'bigint',
    comment: 'id of the building',
    transformer: valueTransformerBigint,
  })
  bid :bigint;

  @ManyToOne(() => BuildingEntity, build => build.output, {
    nullable: true,
    lazy: true,
  })
  input :Promise<BuildingEntity | null>;

  @OneToMany(() => BuildingEntity, build => build.input, {
    nullable: true,
    lazy: true,
  })
  output :Promise<BuildingEntity[] | null>;

  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: '1',
    comment: 'N parts, N% of ready parts, 0 or 0% - infinite',
  })
  batchSize :string;

  @ManyToOne(() => ManufactureEntity, manufacture => manufacture.buildings, {
    nullable: true,
    lazy: true,
    cascade: false,
    onDelete: 'SET NULL',
  })
  manufacture :Promise<Nullable<ManufactureEntity>>;

  @Column({
    type: 'jsonb',
    nullable: false,
    default: {},
  })
  meta :IBuildingMeta;

  @ManyToOne(() => BuildingTypeEntity, {
    nullable: false,
    eager: true,
    cascade: true,
    onDelete: 'CASCADE',
    onUpdate: 'NO ACTION',
  })
  type :BuildingTypeEntity;

  @OneToMany(() => BuildingRunConfigEntity, buildRunConfig => buildRunConfig.building, {
    nullable: true,
    eager: true,
    cascade: true,
  })
  runConfig :BuildingRunConfigEntity[];

  get lastRunConfig() {
    return (this.runConfig ?? [])[this.runConfig.length - 1];
  }

  @OneToOne(() => SchedulerEntity, scheduler => scheduler.building, {
    nullable: true,
    cascade: false,
  })
  scheduler :SchedulerEntity;

  @ManyToOne(() => UserEntity, {
    nullable: false,
    cascade: true,
  })
  owner :UserEntity;

  @CreateDateColumn()
  createdAt :Date;

  @UpdateDateColumn()
  updatedAt :Date;
}
