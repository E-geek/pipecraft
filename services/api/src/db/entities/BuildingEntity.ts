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
  constructor(props ?:Partial<BuildingEntity>) {
    super();
    Object.assign(this, props);
  }

  @Generated('increment')
  @PrimaryColumn({
    type: 'bigint',
    comment: 'id of the building',
    transformer: valueTransformerBigint,
  })
  bid :bigint;

  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: '1',
    comment: 'N parts, N% of ready parts, 0 or 0% - infinite',
  })
  batchSize :string;

  @Column({
    type: 'smallint',
    nullable: true,
    default: null,
    comment: 'Priority of the process, less is high like in linux, from -20 to 20',
  })
  nice :number;

  @ManyToOne(() => ManufactureEntity, manufacture => manufacture.buildings, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'NO ACTION',
  })
  manufacture :Nullable<ManufactureEntity>;

  @Column({
    type: 'jsonb',
    nullable: false,
    default: {},
  })
  meta :IBuildingMeta;

  @ManyToOne(() => BuildingTypeEntity, {
    nullable: false,
    eager: true,
    onDelete: 'CASCADE',
    onUpdate: 'NO ACTION',
  })
  type :BuildingTypeEntity;

  @OneToMany(() => BuildingRunConfigEntity, buildRunConfig => buildRunConfig.building, {
    nullable: true,
    eager: true,
    onDelete: 'CASCADE',
    onUpdate: 'NO ACTION',
  })
  runConfig :BuildingRunConfigEntity[];

  get lastRunConfig() {
    return (this.runConfig ?? [])[this.runConfig.length - 1];
  }

  @OneToOne(() => SchedulerEntity, scheduler => scheduler.building, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  scheduler :SchedulerEntity;

  @ManyToOne(() => UserEntity, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  owner :UserEntity;

  @CreateDateColumn()
  createdAt :Date;

  @UpdateDateColumn()
  updatedAt :Date;
}
