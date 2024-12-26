import { Memory } from '../db/entities/Memory';
import { Column, Entity } from 'typeorm';

@Entity({
  name: 'memory_test_printer',
})
export class TestPrinter extends Memory {
  @Column({
    type: 'varchar',
    length: 64,
  })
  string :string;

  @Column({
    type: 'integer',
  })
  number :number;
}
