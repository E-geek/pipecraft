import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { IPiece } from '@pipecraft/types';

@Entity()
@Index([ 'pid', 'outputId' ], { unique: true })
export class Piece {
  @PrimaryGeneratedColumn('increment', {
    type: 'bigint',
  })
  pid :bigint;

  @Column({
    type: 'bigint',
    comment: 'ID of source piece (miner/factory/etc id)',
    nullable: false,
  })
  outputId :bigint;
  
  @CreateDateColumn()
  createdAt :Date;

  @Column({
    type: 'jsonb',
    nullable: false,
  })
  data :IPiece;
}
