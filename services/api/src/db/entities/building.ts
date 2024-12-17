import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { IBuildingMeta } from '@pipecraft/types';

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

  @CreateDateColumn()
  createdAt :Date;
}
