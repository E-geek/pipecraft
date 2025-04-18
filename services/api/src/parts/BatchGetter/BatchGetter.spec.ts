import { IAttempts, IPieceId } from '@pipecraft/types';
import { DirectBatchGetter } from './DirectBatchGetter';
import { ReverseBatchGetter } from './ReverseBatchGetter';

describe('BatchGetter', () => {
  const getListIds = (size :number) :IPieceId[] => {
    const result :IPieceId[] = [];
    for (let i = 0; i < size; i++) {
      result.push(BigInt(i) as IPieceId);
    }
    return result;
  };

  const getNotEmptyRecycleSource = () :[IPieceId, IAttempts][] => {
    return [[ 44n, 1 ], [ 55n, 1 ], [ 70n, 1 ], [ 77n, 1 ]] as [IPieceId, IAttempts][];
  };

  it('test simple direct batch getter', () => {
    const holdList = new Set<IPieceId>();
    const recycleList = new Map<IPieceId, IAttempts>();
    const heapList = new Set(getListIds(10));
    const batchGetter = new DirectBatchGetter({
      firstCursor: -1n as IPieceId,
      lastCursor: -1n as IPieceId,
      heapList: heapList,
      holdList: holdList,
      recycleList: recycleList,
      maxAttempts: 100 as IAttempts,
    });
    expect(holdList.size).toBe(0);
    expect(recycleList.size).toBe(0);
    const r0 = batchGetter.getBatch(4);
    expect(r0).toMatchObject([ 0n, 1n, 2n, 3n ]);
    batchGetter.release(r0);
    expect(holdList.size).toBe(0);
    expect(recycleList.size).toBe(0);
    const r1 = batchGetter.getBatch(4);
    expect(r1).toMatchObject([ 4n, 5n, 6n, 7n ]);
    batchGetter.release([ 5n, 6n, 7n ] as IPieceId[]);
    batchGetter.recycle([ 3n, 4n ] as IPieceId[]);
    expect(holdList.size).toBe(0);
    expect(recycleList.size).toBe(2);
    const r2 = batchGetter.getBatch(4);
    expect(r2).toMatchObject([ 3n, 4n, 8n, 9n ]);
    batchGetter.release(r2);
    expect(holdList.size).toBe(0);
    expect(recycleList.size).toBe(0);
    const r3 = batchGetter.getBatch(4);
    expect(r3).toHaveLength(0);
    heapList.add(10n as IPieceId);
    heapList.add(11n as IPieceId);
    const r4 = batchGetter.getBatch(4);
    expect(r4).toMatchObject([ 10n, 11n ]);
    expect(holdList.size).toBe(2);
    batchGetter.release(r4);
    expect(holdList.size).toBe(0);
    expect(recycleList.size).toBe(0);
  });

  it('test "real" direct batch getter', () => {
    const holdList = new Set<IPieceId>([ 33n, 77n ] as IPieceId[]);
    const recycleList = new Map<IPieceId, IAttempts>(getNotEmptyRecycleSource() );
    const heapList =
      new Set(getListIds(10))
      .union(
        new Set(getListIds(10)
          .map((id) => (id + 100n) as IPieceId)
        )
      );
    const batchGetter = new DirectBatchGetter({
      firstCursor: 10n as IPieceId,
      lastCursor: 100n as IPieceId,
      heapList: heapList,
      holdList: holdList,
      recycleList: recycleList,
      maxAttempts: 100 as IAttempts,
    });
    const r0 = batchGetter.getBatch(4);
    expect(r0).toMatchObject([ 0n, 1n, 2n, 3n ]);
    const r1 = batchGetter.getBatch(6);
    expect(r1).toMatchObject([ 4n, 5n, 6n, 7n, 8n, 9n ]);
    batchGetter.recycle([ 100n ] as IPieceId[]);
    const r2 = batchGetter.getBatch(4);
    expect(r2).toMatchObject([ 44n, 55n, 70n, 100n ]);
    batchGetter.release(r0);
    batchGetter.release(r1);
    batchGetter.release(r2);
    batchGetter.release([ 77n ] as IPieceId[]);
    batchGetter.recycle([ 2n, 9n, 33n, 100n ] as IPieceId[]);
    expect(holdList.size).toBe(0);
    expect(recycleList.size).toBe(5);
    const r3 = batchGetter.getBatch(7);
    expect(r3).toMatchObject([ 2n, 9n, 33n, 77n, 100n, 101n, 102n ]);
    batchGetter.release(r3);
    expect(holdList.size).toBe(0);
    expect(recycleList.size).toBe(0);
  });

  // similar tests for ReverseBatchGetter
  it('test simple reverse batch getter', () => {
    const holdList = new Set<IPieceId>();
    const recycleList = new Map<IPieceId, IAttempts>();
    const heapList = new Set(getListIds(10));
    const batchGetter = new ReverseBatchGetter({
      firstCursor: -1n as IPieceId,
      lastCursor: -1n as IPieceId,
      heapList: heapList,
      holdList: holdList,
      recycleList: recycleList,
      maxAttempts: 100 as IAttempts,
    });
    expect(holdList.size).toBe(0);
    expect(recycleList.size).toBe(0);
    const r0 = batchGetter.getBatch(4);
    expect(r0).toMatchObject([ 9n, 8n, 7n, 6n ]);
    batchGetter.release(r0);
    expect(holdList.size).toBe(0);
    expect(recycleList.size).toBe(0);
    const r1 = batchGetter.getBatch(4);
    expect(r1).toMatchObject([ 5n, 4n, 3n, 2n ]);
    batchGetter.release([ 4n, 3n, 2n ] as IPieceId[]);
    batchGetter.recycle([ 6n, 5n ] as IPieceId[]);
    expect(holdList.size).toBe(0);
    expect(recycleList.size).toBe(2);
    const r2 = batchGetter.getBatch(4);
    expect(r2).toMatchObject([ 6n, 5n, 1n, 0n ]);
    batchGetter.release(r2);
    expect(holdList.size).toBe(0);
    expect(recycleList.size).toBe(0);
    const r3 = batchGetter.getBatch(4);
    expect(r3).toHaveLength(0);
    heapList.add(10n as IPieceId);
    heapList.add(11n as IPieceId);
    const r4 = batchGetter.getBatch(4);
    expect(r4).toMatchObject([ 11n, 10n ]);
    expect(holdList.size).toBe(2);
    batchGetter.release(r4);
    expect(holdList.size).toBe(0);
    expect(recycleList.size).toBe(0);
  });

  it('test "real" reverse batch getter', () => {
    const holdList = new Set<IPieceId>([ 33n, 77n ] as IPieceId[]);
    const recycleList = new Map<IPieceId, IAttempts>(getNotEmptyRecycleSource());
    const heapList =
      new Set(getListIds(10))
      .union(
        new Set(getListIds(10)
          .map((id) => (id + 100n) as IPieceId)
        )
      );
    const batchGetter = new ReverseBatchGetter({
      firstCursor: 9n as IPieceId,
      lastCursor: 99n as IPieceId,
      heapList: heapList,
      holdList: holdList,
      recycleList: recycleList,
      maxAttempts: 100 as IAttempts,
    });
    const r0 = batchGetter.getBatch(4);
    expect(r0).toMatchObject([ 109n, 108n, 107n, 106n ]);
    const r1 = batchGetter.getBatch(6);
    expect(r1).toMatchObject([ 105n, 104n, 103n, 102n, 101n, 100n ]);
    batchGetter.recycle([ 100n ] as IPieceId[]);
    const r2 = batchGetter.getBatch(4);
    expect(r2).toMatchObject([ 100n, 70n, 55n, 44n ]);
    batchGetter.release(r0);
    batchGetter.release(r1);
    batchGetter.release(r2);
    batchGetter.release([ 77n ] as IPieceId[]);
    batchGetter.recycle([ 2n, 9n, 33n, 100n ] as IPieceId[]);
    expect(holdList.size).toBe(0);
    expect(recycleList.size).toBe(5);
    const r3 = batchGetter.getBatch(7);
    expect(r3).toMatchObject([ 100n, 77n, 33n, 9n, 8n, 7n, 2n ]);
    batchGetter.release(r3);
    expect(holdList.size).toBe(0);
    expect(recycleList.size).toBe(0);
  });

  it('test on max attempts', () => {
    const holdList = new Set<IPieceId>();
    const recycleList = new Map<IPieceId, IAttempts>();
    const heapList = new Set(getListIds(10));
    const batchGetter = new DirectBatchGetter({
      firstCursor: -1n as IPieceId,
      lastCursor: -1n as IPieceId,
      heapList: heapList,
      holdList: holdList,
      recycleList: recycleList,
      maxAttempts: 5 as IAttempts,
    });
    let i = 0;
    while(i++ < 100) {
      const batch = batchGetter.getBatch(1);
      if (batch.length === 0) {
        break;
      }
      const [ id ] = batch;
      if (id % 2n === 0n) {
        batchGetter.recycle([ id ] );
      } else {
        batchGetter.release([ id ]);
      }
    }
    expect(holdList.size).toBe(0);
    expect(recycleList.size).toBe(5);
    for (const [ id, attempts ] of recycleList) {
      expect(attempts).toBe(5);
      expect(id % 2n).toBe(0n);
    }
  });

  it('test on max attempts for reverse', () => {
    const holdList = new Set<IPieceId>();
    const recycleList = new Map<IPieceId, IAttempts>();
    const heapList = new Set(getListIds(10));
    const batchGetter = new ReverseBatchGetter({
      firstCursor: -1n as IPieceId,
      lastCursor: -1n as IPieceId,
      heapList: heapList,
      holdList: holdList,
      recycleList: recycleList,
      maxAttempts: 5 as IAttempts,
    });
    let i = 0;
    while(i++ < 100) {
      const batch = batchGetter.getBatch(1);
      if (batch.length === 0) {
        break;
      }
      const [ id ] = batch;
      if (id % 2n === 0n) {
        batchGetter.recycle([ id ] );
      } else {
        batchGetter.release([ id ]);
      }
    }
    expect(holdList.size).toBe(0);
    expect(recycleList.size).toBe(5);
    for (const [ id, attempts ] of recycleList) {
      expect(attempts).toBe(5);
      expect(id % 2n).toBe(0n);
    }
  });

  it('bug with 2 on start, add 5, add 3 and receive by 4 max', () => {
    const holdList = new Set<IPieceId>();
    const recycleList = new Map<IPieceId, IAttempts>();
    const heapList = new Set([ 2n, 1n ] as IPieceId[]);
    const batchGetter = new ReverseBatchGetter({
      firstCursor: -1n as IPieceId,
      lastCursor: -1n as IPieceId,
      heapList: heapList,
      holdList: holdList,
      recycleList: recycleList,
      maxAttempts: 5 as IAttempts,
    });
    const batches :IPieceId[][] = [];
    batches.push(batchGetter.getBatch(4)); // 2, 1
    for (let i = 7n; i >= 3n; i--) {
      heapList.add(i as IPieceId);
    }
    batchGetter.release(batches[0]);
    batches.push(batchGetter.getBatch(4)); // 7, 6, 5, 4
    batchGetter.release(batches[1]);
    batches.push(batchGetter.getBatch(4)); // 3
    batchGetter.release(batches[2]);
    for (let i = 10n; i >= 8n; i--) {
      heapList.add(i as IPieceId);
    }
    batches.push(batchGetter.getBatch(4)); // 10, 9, 8
    batchGetter.release(batches[3]);
    expect(batches).toMatchObject([
      [ 2n, 1n ],
      [ 7n, 6n, 5n, 4n ],
      [ 3n ],
      [ 10n, 9n, 8n ],
    ]);
  });
});
