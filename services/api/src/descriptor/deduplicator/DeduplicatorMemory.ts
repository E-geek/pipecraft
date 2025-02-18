import { Column, Entity } from 'typeorm';
import { Memory } from '@/db/entities/Memory';

@Entity({
  name: 'memory_deduplicator',
})
export class DeduplicatorMemory extends Memory {
  constructor(props ?:Partial<DeduplicatorMemory>) {
    super();
    Object.assign(this, props);
  }

  @Column({
    type: 'varchar',
    length: 64,
    default: null,
  })
  hash :string;

  @Column({
    type: 'text',
    default: null,
  })
  raw :string;
}
