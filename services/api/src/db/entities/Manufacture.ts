import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { User } from './User';
import { PipeMemory } from './PipeMemory';
import { Building } from './Building';
import { Scheduler } from './Scheduler';

@Entity()
export class Manufacture {
  @PrimaryGeneratedColumn('increment', {
    type: 'bigint',
    comment: 'id of the manufacture'
  })
  mid :bigint;

  @ManyToOne(() => User, user => user.manufactures, {
    nullable: true,
    eager: false,
  })
  owner :User | null;

  @Column({
    type: 'varchar',
    length: 128,
    nullable: false,
    comment: 'title of the manufacture',
    default: 'New manufacture',
  })
  title :string;

  @OneToMany(() => Building, (building :Building) => building.manufacture, {
    eager: true,
  })
  buildings :Building[];

  @OneToMany(() => PipeMemory, (pipe :PipeMemory) => pipe.manufacture, {
    eager: true,
  })
  pipes :PipeMemory[];

  @OneToMany(() => Scheduler, (scheduler :Scheduler) => scheduler.manufacture, {
    eager: true,
  })
  schedulers :Scheduler[];

  @CreateDateColumn()
  createdAt :Date;

  @UpdateDateColumn()
  updatedAt :Date;
}
