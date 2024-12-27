import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { tmpdir } from 'node:os';

import { ManufactureService } from './manufacture.service';

import { TestPrinter } from '../test/TestPrinter';
import { getTestDBConf } from '../test/db.conf';

describe('ManufactureService', () => {
  let service :ManufactureService;
  let testPrinterRepo :Repository<TestPrinter>;

  beforeEach(async () => {
    const module :TestingModule = await Test.createTestingModule({
      providers: [ ManufactureService ],
      imports: [
        TypeOrmModule.forRoot(getTestDBConf()),
        TypeOrmModule.forFeature([ TestPrinter ]),
      ]
    }).compile();

    service = module.get<ManufactureService>(ManufactureService);
    testPrinterRepo = module.get<Repository<TestPrinter>>(getRepositoryToken(TestPrinter));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(service.startFromMining).toBeDefined();
  });

  it('check full pipe', async () => {
    // 1. Generate 10 JSONs into `tmpdir` and store via NN.json Format: {num: RandomNumber, str: RandomNumber + 's'}
    // 2. Run manufacture and pass test miner
    // 3. Await for finish
    // 4. check for memory of the printer for: column numbers should store num * 2, column strings should store 'p' + str,
    const appTmpDir = await fs.mkdtemp(path.join(tmpdir(), 'test-'));
    const files = [];
    interface IExampleData {
      num :number;
      str :string;
    }
    const records :IExampleData[] = [];
    for (let i = 0; i < 10; i++) {
      const file = `${i.toString().padStart(2, '0')}.json`;
      files.push(file);
      const row = { num: Math.random(), str: Math.random() + 's' };
      records.push(row);
      await fs.writeFile(path.join(appTmpDir, file), JSON.stringify(row));
    }
    await service.startFromMining(1n, { config: { path: appTmpDir }});
    const printer = await testPrinterRepo.find({ order: { mid: 'ASC' }});
    expect(printer).toHaveLength(10);
    for (let i = 0; i < 10; i++) {
      expect(printer[i].number).toBe(records[i].num * 2);
      expect(printer[i].string).toBe('p' + records[i].str);
    }
  });
});
