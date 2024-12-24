import crypto from 'crypto';
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Peer } from './Peer';
import { IUserMeta } from '@pipecraft/types';

let globalSalt = 'NOT_SET_YEST';

@Entity({
  comment: 'User with permissions and roles',
})
export class User {
  @PrimaryGeneratedColumn('uuid', {
    comment: 'user id'
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

  @OneToMany(() => Peer, (peer) => peer.user)
  peers :Peer[];

  @Column({
    type: 'jsonb',
    nullable: false,
    default: {},
    comment: 'meta for the user',
  })
  meta :IUserMeta;

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
        autoDestroy: true
      })
      .update(password + salt)
      .digest();
  }

  isCorrectPassword(password :string, salt :string = globalSalt) :boolean {
    return this.password.compare(User.getPasswordHash(password, salt)) === 0;
  }
}
