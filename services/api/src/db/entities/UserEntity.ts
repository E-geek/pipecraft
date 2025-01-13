import * as crypto from 'crypto';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IUserMeta } from '@pipecraft/types';
import { PeerEntity } from './PeerEntity';
import { ManufactureEntity } from './ManufactureEntity';

let globalSalt = 'NOT_SET_YEST';

@Entity({
  comment: 'User with permissions and roles',
  name: 'user',
})
export class UserEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', {
    comment: 'user id',
  })
  uid :string;

  @Column({
    type: 'varchar',
    length: 128,
    nullable: false,
    unique: true,
    comment: 'email as login',
  })
  email :string;

  @Column({
    type: 'bytea',
    nullable: true,
    comment: 'password hash',
  })
  password :Buffer;

  @Column({
    type: 'varchar',
    length: 128,
    nullable: false,
    comment: 'name of the user',
  })
  name :string;

  @Column({
    type: 'boolean',
    nullable: false,
    default: false,
    comment: 'is user verified',
  })
  isVerified :boolean;

  @OneToMany(() => PeerEntity, (peer) => peer.user)
  peers :PeerEntity[];

  @Column({
    type: 'jsonb',
    nullable: false,
    default: {},
    comment: 'meta for the user',
  })
  meta :IUserMeta;

  @OneToMany(() => ManufactureEntity, manufacture => manufacture.owner)
  manufactures :ManufactureEntity[];

  @CreateDateColumn()
  createdAt :Date;

  @UpdateDateColumn()
  updatedAt :Date;

  // setup salt if need
  static setSalt(salt :string) {
    globalSalt = salt;
  }

  // get sha256 hash of password with salt
  static getPasswordHash(password :string, salt :string = globalSalt) :Buffer {
    return crypto
      .createHash('sha256', {
        autoDestroy: true,
      })
      .update(password + salt)
      .digest();
  }

  isCorrectPassword(password :string, salt :string = globalSalt) :boolean {
    return this.password.compare(UserEntity.getPasswordHash(password, salt)) === 0;
  }
}
