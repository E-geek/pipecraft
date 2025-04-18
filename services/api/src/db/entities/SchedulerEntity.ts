import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn, ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Nullable } from '@pipecraft/types';
import { BuildingEntity } from './BuildingEntity';
import { ManufactureEntity } from './ManufactureEntity';

@Entity({
  comment: 'Store all schedulers',
  name: 'scheduler',
})
@Index([ 'isActive' ], {
  unique: false,
  where: '"isActive" = true',
})
export class SchedulerEntity extends BaseEntity {
  constructor(props ?:Partial<SchedulerEntity>) {
    super();
    Object.assign(this, props);
  }

  @PrimaryGeneratedColumn('uuid', {
    comment: 'user id',
  })
  sid :string;

  @Column({
    type: 'boolean',
    nullable: false,
    default: true,
    comment: 'should works or not',
  })
  isActive :boolean;

  @OneToOne(() => BuildingEntity, (building :BuildingEntity) => building.scheduler, {
    nullable: false,
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  building :BuildingEntity;

  // for building we can use https://crontab.guru/
  @Column({
    type: 'varchar',
    length: 64,
    nullable: false,
    comment: 'cron string',
  })
  cron :string;

  @ManyToOne(() => ManufactureEntity, (manufacture :ManufactureEntity) => manufacture.schedulers, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  manufacture :Nullable<ManufactureEntity>;

  @CreateDateColumn()
  createdAt :Date;

  @UpdateDateColumn()
  updatedAt :Date;
}
