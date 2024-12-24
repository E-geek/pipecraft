import { CreateDateColumn, Entity, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BuildingRunConfig } from './BuildingRunConfig';
import { Piece } from './Piece';

// Yes, this is additional columns for a Piece but it can be clear by other ruleset
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
