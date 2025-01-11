import { BaseEntity, Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { IPieceId, IPieceMeta } from '@pipecraft/types';
import { Building } from './Building';

@Entity({
  comment: 'Elementary data portion for processing',
  orderBy: {
    pid: 'ASC',
  }
})
@Index([ 'pid', 'from' ], { unique: true })
export class Piece extends BaseEntity {
  @PrimaryGeneratedColumn('increment', {
    type: 'bigint',
    comment: 'id and default ordering key'
  })
  pid :IPieceId;

  @ManyToOne(() => Building, {
    nullable: false,
    cascade: true,
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
