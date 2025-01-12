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
import { Building } from './Building';

@Entity({
  comment: 'Elementary data portion for processing',
  orderBy: {
    pid: 'ASC',
  }
})
@Index([ 'pid', 'from' ], { unique: true })
export class Piece extends BaseEntity {
  @Generated('increment')
  @PrimaryColumn({
    type: 'bigint',
    comment: 'id and default ordering key',
    transformer: valueTransformerBigint,
  })
  pid :IPieceId;

  @ManyToOne(() => Building, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  from :Building;

  @CreateDateColumn()
  createdAt :Date;

  @Column({
    type: 'jsonb',
    nullable: false,
  })
  data :IPieceMeta;

  constructor(from ?:Building, data ?:IPieceMeta) {
    super();
    if (from != null) {
      this.from = from;
    }
    if (data != null) {
      this.data = data;
    }
  }
}
