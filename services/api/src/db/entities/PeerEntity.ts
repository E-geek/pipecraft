import { randomBytes } from 'crypto';
import {
  BaseEntity,
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import jwt, { TokenExpiredError } from 'jsonwebtoken';
import { UserEntity } from './UserEntity';

export type IPeerTokenStatus = 'ok' | 'expired' | 'invalid';

/**
 * Generate a random secret length of 32
 */
const generateSecretUntilSuccessOrSafeMethod = (length :number, encoding :BufferEncoding = 'utf8') :string => {
  for (let i = 0; i < 1000; i++) {
    const secret = randomBytes(length).toString(encoding);
    if (secret.length === length) {
      return secret;
    }
  }
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .substring(0, length);
};

@Entity({
  comment: 'Peer for every user login',
  name: 'peer',
})
export class PeerEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', {
    comment: 'peer id',
  })
  peerId :string;

  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    comment: 'peer secret',
  })
  peerSecret :string;

  @Column({
    type: 'varchar',
    length: 128,
    nullable: false,
    comment: 'data for validation final check',
  })
  controlData :string;

  @Column({
    type: 'varchar',
    length: 128,
    nullable: true,
    default: null,
    comment: 'least user agent',
  })
  userAgent :string | null;

  @ManyToOne(() => UserEntity, (user) => user.peers)
  user :UserEntity;

  @CreateDateColumn()
  createdAt :Date;

  @UpdateDateColumn()
  updatedAt :Date;

  @BeforeInsert()
  generateSecret() {
    this.peerSecret = generateSecretUntilSuccessOrSafeMethod(32);
    this.controlData = generateSecretUntilSuccessOrSafeMethod(128);
  }

  /**
   * Return JWT signed and encrypted token
   */
  getToken() {
    return jwt.sign({
      data: this.controlData,
    }, this.peerSecret, {
      expiresIn: '14d',
      algorithm: 'HS256',
    });
  }

  /**
   * Validate token and time status
   * @param token
   */
  validateToken(token :string) :IPeerTokenStatus {
    try {
      const data = jwt.verify(token, this.peerSecret, {
        algorithms: [ 'HS256' ],
      });
      if (typeof data !== 'string' && data.data === this.controlData) {
        return 'ok';
      }
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        return 'expired';
      }
    }
    return 'invalid';
  }
}
