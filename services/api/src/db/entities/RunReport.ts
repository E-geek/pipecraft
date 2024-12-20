import { CreateDateColumn, Entity, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BuildingRunConfig } from './BuildingRunConfig';
import { Piece } from './Piece';

@Entity({
  comment: 'Every piece has a context of creation. This is important data for debugging and auditing'
})
export class RunReport {
  @PrimaryGeneratedColumn('increment', {
    type: 'bigint',
    comment: 'id and default ordering key'
  })
  rrid :bigint;

  @ManyToOne(() => BuildingRunConfig, (buildingRunConfig) => buildingRunConfig.runReport)
  buildingRunConfig :BuildingRunConfig;

  @OneToOne(() => Piece, {
    cascade: true,
    eager: true,
  })
  piece :Piece;

  @CreateDateColumn()
  createdAt :Date;
}
