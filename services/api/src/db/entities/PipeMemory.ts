import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity, Generated,
  ManyToOne, PrimaryColumn,
  UpdateDateColumn
} from 'typeorm';
import { IPieceId, Nullable, Opaque } from '@pipecraft/types';
import { valueTransformerBigint } from '../helpers/valueTransformerBigint';
import { Building } from './Building';
import { Manufacture } from './Manufacture';

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
export class PipeMemory extends BaseEntity {
  @Generated('increment')
  @PrimaryColumn({
    type: 'bigint',
    comment: 'id and default ordering key',
    transformer: valueTransformerBigint,
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
    comment: 'Minimum piece id which take to a process',
    transformer: valueTransformerBigint,
  })
  firstCursor :bigint;

  @Column({
    type: 'bigint',
    nullable: false,
    default: -1,
    comment: 'Maximum piece id which take to a process',
    transformer: valueTransformerBigint,
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

  @ManyToOne(() => Manufacture, {
    nullable: true,
    lazy: true,
    cascade: false,
    onDelete: 'SET NULL',
  })
  manufacture :Promise<Nullable<Manufacture>>;

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
  reserved :IPieceId[];

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
        BigInt(this.returnedRaw[i]) as IPieceId,
        Number(this.returnedRaw[i + 1]) as IAttempts,
      ]);
    }
    return out;
  }

  set returned(value :IReturnedPieces) {
    this.returnedRaw = [];
    for (const [ pid, attempts ] of value) {
      this.returnedRaw.push(pid);
      this.returnedRaw.push(BigInt(attempts));
    }
  }
}
