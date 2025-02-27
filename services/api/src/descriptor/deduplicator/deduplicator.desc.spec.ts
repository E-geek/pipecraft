import { createHash } from 'node:crypto';
import { Repository } from 'typeorm';
import { IBuildingRunArgs } from '@pipecraft/types';
import { DeduplicatorMemory } from './DeduplicatorMemory';
import { type } from './deduplicator.desc';

describe('Deduplicator descriptor', () => {
  let repository :jest.Mocked<Repository<DeduplicatorMemory>>;
  let memory :DeduplicatorMemory[][];
  const { descriptor } = type;

  beforeEach(() => {
    repository = {
      existsBy: jest.fn(),
      save: jest.fn(),
    } as any;
    memory = [[ repository as any ]];
  });

  it('processes input pieces and deduplicates based on raw type', async () => {
    const args = {
      bid: 'test-bid',
      input: [{ data: { key: 'value' }, pid: 'pid1' }],
      push: jest.fn(),
      memory,
      buildingMeta: { type: 'raw' },
      runConfig: { path: null },
    } as unknown as IBuildingRunArgs;

    repository.existsBy.mockResolvedValue(false);

    const result = await descriptor.gear(args);

    expect(repository.existsBy).toHaveBeenCalledWith({ bid: 'test-bid', raw: JSON.stringify({ key: 'value' }) });
    expect(repository.save).toHaveBeenCalledWith({ bid: 'test-bid', raw: JSON.stringify({ key: 'value' }) });
    expect(args.push).toHaveBeenCalledWith([{ key: 'value' }]);
    expect(result.okResult).toEqual([ 'pid1' ]);
    expect(result.errorResult).toEqual([]);
    expect(result.logs).toEqual([{
      'message': 'Process: 1, Pass: 1, Reject: 0',
    }]);
  });

  it('processes input pieces and deduplicates based on sha256 type', async () => {
    const args = {
      bid: 'test-bid',
      input: [{ data: { key: 'value' }, pid: 'pid1' }],
      push: jest.fn(),
      memory,
      buildingMeta: { type: 'sha256' },
      runConfig: { path: null },
    } as unknown as IBuildingRunArgs;

    repository.existsBy.mockResolvedValue(false);

    const result = await descriptor.gear(args);

    const hash = createHash('sha256').update(JSON.stringify({ key: 'value' })).digest('hex');
    expect(repository.existsBy).toHaveBeenCalledWith({ bid: 'test-bid', hash });
    expect(repository.save).toHaveBeenCalledWith({ bid: 'test-bid', hash });
    expect(args.push).toHaveBeenCalledWith([{ key: 'value' }]);
    expect(result.okResult).toEqual([ 'pid1' ]);
    expect(result.errorResult).toEqual([]);
    expect(result.logs).toEqual([{
      'message': 'Process: 1, Pass: 1, Reject: 0',
    }]);
  });

  it('rejects duplicate pieces based on raw type', async () => {
    const args = {
      bid: 'test-bid',
      input: [{ data: { key: 'value' }, pid: 'pid1' }],
      push: jest.fn(),
      memory,
      buildingMeta: { type: 'raw' },
      runConfig: { path: null },
    } as unknown as IBuildingRunArgs;

    repository.existsBy.mockResolvedValue(true);

    const result = await descriptor.gear(args);

    expect(repository.existsBy).toHaveBeenCalledWith({ bid: 'test-bid', raw: JSON.stringify({ key: 'value' }) });
    expect(repository.save).not.toHaveBeenCalled();
    expect(args.push).toHaveBeenCalledWith([]);
    expect(result.okResult).toEqual([ 'pid1' ]);
    expect(result.errorResult).toEqual([]);
    expect(result.logs).toEqual([{
      'message': 'Process: 1, Pass: 0, Reject: 1',
    }]);
  });

  it('rejects duplicate pieces based on sha256 type', async () => {
    const args = {
      bid: 'test-bid',
      input: [{ data: { key: 'value' }, pid: 'pid1' }],
      push: jest.fn(),
      memory,
      buildingMeta: { type: 'sha256' },
      runConfig: { path: null },
    } as unknown as IBuildingRunArgs;

    repository.existsBy.mockResolvedValue(true);

    const result = await descriptor.gear(args);

    const hash = createHash('sha256').update(JSON.stringify({ key: 'value' })).digest('hex');
    expect(repository.existsBy).toHaveBeenCalledWith({ bid: 'test-bid', hash });
    expect(repository.save).not.toHaveBeenCalled();
    expect(args.push).toHaveBeenCalledWith([]);
    expect(result.okResult).toEqual([ 'pid1' ]);
    expect(result.errorResult).toEqual([]);
    expect(result.logs).toEqual([{
      'message': 'Process: 1, Pass: 0, Reject: 1',
    }]);
  });

  it('processes input pieces with custom path', async () => {
    const args = {
      bid: 'test-bid',
      input: [{ data: { key: { nested: 'value' }}, pid: 'pid1' }],
      push: jest.fn(),
      memory,
      buildingMeta: { type: 'raw' },
      runConfig: { path: 'key.nested' },
    } as unknown as IBuildingRunArgs;

    repository.existsBy.mockResolvedValue(false);

    const result = await descriptor.gear(args);

    expect(repository.existsBy).toHaveBeenCalledWith({ bid: 'test-bid', raw: JSON.stringify('value') });
    expect(repository.save).toHaveBeenCalledWith({ bid: 'test-bid', raw: JSON.stringify('value') });
    expect(args.push).toHaveBeenCalledWith([{ key: { nested: 'value' }}]);
    expect(result.okResult).toEqual([ 'pid1' ]);
    expect(result.errorResult).toEqual([]);
    expect(result.logs).toEqual([{
      'message': 'Process: 1, Pass: 1, Reject: 0',
    }]);
  });
});
