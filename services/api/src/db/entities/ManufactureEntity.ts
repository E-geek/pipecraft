import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity, Generated,
  ManyToOne,
  OneToMany, PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IManufactureMeta } from '@pipecraft/types/manufacture';
import { valueTransformerBigint } from '../helpers/valueTransformerBigint';
import { UserEntity } from './UserEntity';
import { PipeEntity } from './PipeEntity';
import { BuildingEntity } from './BuildingEntity';
import { SchedulerEntity } from './SchedulerEntity';

@Entity({
  comment: 'Data of manufacture: buildings, pipes and schedulers for quick restore',
  name: 'manufacture',
})
export class ManufactureEntity extends BaseEntity {
  constructor(props ?:Partial<ManufactureEntity>) {
    super();
    Object.assign(this, props);
  }

  @Generated('increment')
  @PrimaryColumn({
    type: 'bigint',
    comment: 'id of the manufacture',
    transformer: valueTransformerBigint,
  })
  mid :bigint;

  @ManyToOne(() => UserEntity, user => user.manufactures, {
    nullable: true,
    eager: false,
  })
  owner :UserEntity | null;

  @Column({
    type: 'smallint',
    nullable: false,
    default: 10,
    comment: 'Priority of the process, less is high like in linux, from -20 to 20',
  })
  nice :number;

  @Column({
    type: 'varchar',
    length: 128,
    nullable: false,
    comment: 'title of the manufacture',
    default: 'New manufacture',
  })
  title :string;

  @OneToMany(() => BuildingEntity, (building :BuildingEntity) => building.manufacture, {
    eager: true,
  })
  buildings :BuildingEntity[];

  @OneToMany(() => PipeEntity, (pipe :PipeEntity) => pipe.manufacture, {
    eager: true,
  })
  pipes :PipeEntity[];

  @OneToMany(() => SchedulerEntity, (scheduler :SchedulerEntity) => scheduler.manufacture, {
    eager: true,
  })
  schedulers :SchedulerEntity[];

  @Column({
    type: 'jsonb',
    nullable: false,
    default: {
      isSequential: true,
    },
  })
  meta :IManufactureMeta;

  @CreateDateColumn()
  createdAt :Date;

  @UpdateDateColumn()
  updatedAt :Date;
}
