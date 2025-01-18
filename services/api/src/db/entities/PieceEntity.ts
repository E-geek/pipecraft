import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  Index,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { IPieceId, IPieceMeta } from '@pipecraft/types';
import { valueTransformerBigint } from '../helpers/valueTransformerBigint';
import { BuildingEntity } from './BuildingEntity';

@Entity({
  comment: 'Elementary data portion for processing',
  orderBy: {
    pid: 'ASC',
  },
  name: 'piece',
})
@Index([ 'pid', 'from' ], { unique: true })
export class PieceEntity extends BaseEntity {
  constructor(props ?:Partial<PieceEntity>) {
    super();
    Object.assign(this, props);
  }
  @Generated('increment')
  @PrimaryColumn({
    type: 'bigint',
    comment: 'id and default ordering key',
    transformer: valueTransformerBigint,
  })
  pid :IPieceId;

  @ManyToOne(() => BuildingEntity, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  from :BuildingEntity;

  @CreateDateColumn()
  createdAt :Date;

  @Column({
    type: 'jsonb',
    nullable: false,
  })
  data :IPieceMeta;
}
