import { IBuildingRunArgs } from '@pipecraft/types';
import { type } from './code.desc';

describe('descriptor.gear', () => {
  const { descriptor, title } = type;

  it('returns title', () => {
    expect(title).toEqual('Code');
  });

  it('executes code and returns array result', async () => {
    const args = {
      input: [{ pid: 1 }],
      push: jest.fn(),
      runConfig: { code: 'return [input[0]];' },
    } as unknown as IBuildingRunArgs;
    const result = await descriptor.gear(args);
    expect(result.okResult).toEqual([ 1 ]);
    expect(result.errorResult).toEqual([]);
    expect(result.logs).toEqual([]);
    expect(args.push).toHaveBeenCalledWith([{ pid: 1 }]);
  });

  it('returns error when code does not return array', async () => {
    const args = {
      input: [{ pid: 1 }],
      push: jest.fn(),
      runConfig: { code: 'return input[0];' },
    } as unknown as IBuildingRunArgs;
    const result = await descriptor.gear(args);
    expect(result.okResult).toEqual([]);
    expect(result.errorResult).toEqual([ 1 ]);
    expect(result.logs).toEqual([{
      'level': 'ERROR',
      'message': 'Code must return an array',
    }]);
  });

  it('returns error when code throws an exception', async () => {
    const args = {
      input: [{ pid: 1 }],
      push: jest.fn(),
      runConfig: { code: 'throw new Error("Test error");' },
    } as unknown as IBuildingRunArgs;
    const result = await descriptor.gear(args);
    expect(result.okResult).toEqual([]);
    expect(result.errorResult).toEqual([ 1 ]);
    expect(result.logs).toEqual([{
      message: 'Test error',
      level: 'ERROR',
    }]);
  });

  it('handles empty input array', async () => {
    const args = {
      input: [],
      push: jest.fn(),
      runConfig: { code: 'return [];' },
    } as unknown as IBuildingRunArgs;
    const result = await descriptor.gear(args);
    expect(result.okResult).toEqual([]);
    expect(result.errorResult).toEqual([]);
    expect(result.logs).toEqual([]);
    expect(args.push).toHaveBeenCalledWith([]);
  });

  it('input is list of prime numbers and output is square of primes', async () => {
    const args = {
      input: [{ pid: 4, data: 3 }, { pid: 16, data: 5 }, { pid: 32, data: 7 }, { pid: 33, data: 11 }],
      push: jest.fn(),
      runConfig: {
        code: `
        const list = input.map(({ data }) => data);
        return list.map(value => value * value);
      `,
      },
    } as unknown as IBuildingRunArgs;
    const result = await descriptor.gear(args);
    expect(result.okResult).toEqual([ 4, 16, 32, 33 ]);
    expect(result.errorResult).toEqual([]);
    expect(result.logs).toEqual([]);
    expect(args.push).toHaveBeenCalledWith([
      9,
      25,
      49,
      121,
    ]);
  });
});
