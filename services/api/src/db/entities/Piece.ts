import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { IPiece, IPieceId } from '@pipecraft/types';
import { Building } from './Building';

@Entity({
  comment: 'Elementary data portion for processing',
  orderBy: {
    pid: 'ASC',
  }
})
@Index([ 'pid', 'from' ], { unique: true })
export class Piece {
  @PrimaryGeneratedColumn('increment', {
    type: 'bigint',
    comment: 'id and default ordering key'
  })
  pid :IPieceId;

  @ManyToOne(() => Building, {
    nullable: false,
    lazy: false,
    cascade: true,
    onDelete: 'CASCADE',
    onUpdate: 'NO ACTION',
  })
  from :Building;
  
  @CreateDateColumn()
  createdAt :Date;

  @Column({
    type: 'jsonb',
    nullable: false,

  })
  data :IPiece;
}
