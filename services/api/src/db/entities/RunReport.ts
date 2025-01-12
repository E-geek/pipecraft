import {
  CreateDateColumn,
  Entity, Generated,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { valueTransformerBigint } from '../helpers/valueTransformerBigint';
import { BuildingRunConfig } from './BuildingRunConfig';
import { Piece } from './Piece';

// Yes, this is additional columns for a Piece, but it can be clear by other ruleset
@Entity({
  comment: 'Every piece has a context of creation. This is important data for debugging and auditing'
})
export class RunReport {
  @Generated('increment')
  @PrimaryColumn({
    type: 'bigint',
    comment: 'id and default ordering key',
    transformer: valueTransformerBigint,
  })
  rrid :bigint;

  @ManyToOne(() => BuildingRunConfig, (buildingRunConfig) => buildingRunConfig.runReport)
  buildingRunConfig :BuildingRunConfig;

  @OneToOne(() => Piece, {
    cascade: true,
    eager: true,
  })
  @JoinColumn()
  piece :Piece;

  @CreateDateColumn()
  createdAt :Date;
}
