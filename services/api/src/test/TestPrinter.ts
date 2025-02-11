import { Column, Entity } from 'typeorm';
import { Memory } from '../db/entities/Memory';

@Entity({
  name: 'memory_test_printer',
})
export class TestPrinter extends Memory {
  constructor(props ?:Partial<TestPrinter>) {
    super();
    Object.assign(this, props);
  }

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
