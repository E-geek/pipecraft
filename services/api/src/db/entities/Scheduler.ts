import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Building } from './Building';

@Entity({
  comment: 'Store all schedulers',
})
@Index([ 'isActive' ], {
  unique: false,
  where: '"isActive" = true',
})
export class Scheduler {
  @PrimaryGeneratedColumn('uuid', {
    comment: 'user id'
  })
  sid :string;

  @Column({
    type: 'boolean',
    nullable: false,
    default: true,
    comment: 'should works or not',
  })
  isActive :boolean;

  @OneToOne(() => Building, (building :Building) => building.scheduler, {
    nullable: false,
    cascade: true,
    eager: true,
  })
  @JoinColumn()
  building :Building;

  // for building we can use https://crontab.guru/
  @Column({
    type: 'varchar',
    length: 64,
    nullable: false,
    comment: 'cron string',
  })
  cron :string;

  @CreateDateColumn()
  createdAt :Date;

  @UpdateDateColumn()
  updatedAt :Date;
}
