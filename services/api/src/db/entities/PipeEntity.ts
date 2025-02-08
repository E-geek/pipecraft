import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity, Generated,
  ManyToOne, PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IAttempts, IPieceId, Nullable } from '@pipecraft/types';
import { valueTransformerBigint } from '../helpers/valueTransformerBigint';
import { BuildingEntity } from './BuildingEntity';
import { ManufactureEntity } from './ManufactureEntity';

export type IReturnedPiece = [IPieceId, IAttempts];
export type IReturnedPieces = IReturnedPiece[];

/**
 * This class for helps get pieces and translate those to building
 * last cursor (or first cursor and last cursor for reverse) is used
 * for a select batch of pieces from cursor and to N|X% pieces
 */
@Entity({
  comment: 'Config for storing which pieces in the process and which pieces is done',
  name: 'pipe',
})
export class PipeEntity extends BaseEntity {
  constructor(props ?:Partial<PipeEntity>) {
    super();
    Object.assign(this, props);
  }

  @Generated('increment')
  @PrimaryColumn({
    type: 'bigint',
    comment: 'id and default ordering key',
    transformer: valueTransformerBigint,
  })
  pmid :bigint;

  @ManyToOne(() => BuildingEntity, {
    nullable: false,
    eager: true,
    onDelete: 'CASCADE',
    onUpdate: 'NO ACTION',
  })
  from :BuildingEntity;

  @ManyToOne(() => BuildingEntity, {
    nullable: false,
    eager: true,
    onDelete: 'CASCADE',
    onUpdate: 'NO ACTION',
  })
  to :BuildingEntity;

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

  @ManyToOne(() => ManufactureEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  manufacture :Nullable<ManufactureEntity>;

  @CreateDateColumn()
  createdAt :Date;

  @UpdateDateColumn()
  updatedAt :Date;

  @Column({
    array: true,
    type: 'bigint',
    nullable: false,
    default: [],
    comment: 'Pieces hold for processing now',
  })
  holdList :IPieceId[];

  @Column({
    array: true,
    type: 'bigint',
    nullable: false,
    default: [],
    comment: 'Pieces when process failed, crashed, or return the error pieces, ' +
      'format is [pieceId, attempts, pieceId, attempts, ...]',
  })
  recycleListRaw :bigint[];

  get recycleList() :IReturnedPieces {
    const out :IReturnedPieces = [];
    for (let i = 0; i < this.recycleListRaw.length; i += 2) {
      out.push([
        BigInt(this.recycleListRaw[i]) as IPieceId,
        Number(this.recycleListRaw[i + 1]) as IAttempts,
      ]);
    }
    return out;
  }

  set recycleList(value :IReturnedPieces) {
    this.recycleListRaw = [];
    for (const [ pid, attempts ] of value) {
      this.recycleListRaw.push(pid);
      this.recycleListRaw.push(BigInt(attempts));
    }
  }
}
