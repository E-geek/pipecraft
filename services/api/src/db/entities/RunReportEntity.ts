import {
  BaseEntity,
  CreateDateColumn,
  Entity, Generated,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { valueTransformerBigint } from '../helpers/valueTransformerBigint';
import { BuildingRunConfigEntity } from './BuildingRunConfigEntity';
import { PieceEntity } from './PieceEntity';

// Yes, this is additional columns for a Piece, but it can be clear by other ruleset
@Entity({
  comment: 'Every piece has a context of creation. This is important data for debugging and auditing',
  name: 'run_report',
})
export class RunReportEntity extends BaseEntity {
  @Generated('increment')
  @PrimaryColumn({
    type: 'bigint',
    comment: 'id and default ordering key',
    transformer: valueTransformerBigint,
  })
  rrid :bigint;

  @ManyToOne(() => BuildingRunConfigEntity, (buildingRunConfig) => buildingRunConfig.runReport)
  buildingRunConfig :BuildingRunConfigEntity;

  @OneToOne(() => PieceEntity, {
    onDelete: 'CASCADE',
    eager: true,
  })
  @JoinColumn()
  piece :PieceEntity;

  @CreateDateColumn()
  createdAt :Date;
}
