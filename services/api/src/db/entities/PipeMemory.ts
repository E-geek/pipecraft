import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Opaque } from '@pipecraft/types';
import { Building } from './Building';

export type IPieceId = Opaque<bigint, 'pieceId'>;
export type IAttempts = Opaque<number, 'attempts'>;
export type IReturnedPiece = [IPieceId, IAttempts];
export type IReturnedPieces = IReturnedPiece[];

/**
 * This class for helps get pieces and translate those to building
 * last cursor (or first cursor and last cursor for reverse) is used
 * for a select batch of pieces from cursor and to N|X% pieces
 */
@Entity({
  comment: 'Config for storing which pieces in the process and which pieces is done'
})
export class PipeMemory {
  @PrimaryGeneratedColumn('increment', {
    type: 'bigint',
    comment: 'id and default ordering key'
  })
  pmid :bigint;

  @ManyToOne(() => Building, {
    nullable: false,
    eager: true,
    cascade: true,
    onDelete: 'CASCADE',
    onUpdate: 'NO ACTION',
  })
  from :Building;

  @ManyToOne(() => Building, {
    nullable: false,
    eager: true,
    cascade: true,
    onDelete: 'CASCADE',
    onUpdate: 'NO ACTION',
  })
  to :Building;

  @Column({
    type: 'bigint',
    nullable: false,
    default: -1,
    comment: 'Minimum piece id which take to a process'
  })
  firstCursor :bigint;

  @Column({
    type: 'bigint',
    nullable: false,
    default: -1,
    comment: 'Maximum piece id which take to a process'
  })
  lastCursor :bigint;

  @Column({
    type: 'varchar',
    nullable: false,
    default: 'direct',
    comment: 'Ordering of getting pieces',
  })
  ordering :'direct'|'reverse';

  @Column({
    type: 'smallint',
    nullable: false,
    default: 10,
    comment: 'Priority of the process, less is high like in linux, from -20 to 20',
  })
  priority :number;

  @CreateDateColumn()
  createdAt :Date;

  @UpdateDateColumn()
  updatedAt :Date;

  @Column({
    array: true,
    type: 'bigint',
    nullable: false,
    default: [],
    comment: 'Pieces hold for processing now'
  })
  reserved :bigint[];

  @Column({
    array: true,
    type: 'bigint',
    nullable: false,
    default: [],
    comment: 'Pieces when process failed, crashed, or return the error pieces, ' +
      'format is [pieceId, attempts, pieceId, attempts, ...]'
  })
  returnedRaw :bigint[];

  get returned() :IReturnedPieces {
    const out :IReturnedPieces = [];
    for (let i = 0; i < this.returnedRaw.length; i += 2) {
      out.push([
        this.returnedRaw[i] as IPieceId,
        Number(this.returnedRaw[i + 1]) as IAttempts,
      ]);
    }
    return out;
  }
}
