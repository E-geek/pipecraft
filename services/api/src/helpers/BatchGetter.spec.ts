import { IPieceId } from '@pipecraft/types';
import { DirectBatchGetter } from '@/helpers/DirectBatchGetter';

describe('BatchGetter', () => {
  const getListIds = (size :number) :IPieceId[] => {
    const result :IPieceId[] = [];
    for (let i = 0; i < size; i++) {
      result.push(BigInt(i) as IPieceId);
    }
    return result;
  };

  it('test simple direct batch getter', () => {
    const holdList = new Set<IPieceId>();
    const recycleList = new Set<IPieceId>();
    const heapList = new Set(getListIds(10));
    const batchGetter = new DirectBatchGetter({
      firstCursor: -1n as IPieceId,
      lastCursor: -1n as IPieceId,
      heapList: heapList,
      holdList: holdList,
      recycleList: recycleList,
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
    batchGetter.release(r1);
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
    const recycleList = new Set<IPieceId>([ 44n, 55n, 70n, 77n ] as IPieceId[]);
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
    });
    const r0 = batchGetter.getBatch(4);
    expect(r0).toMatchObject([ 0n, 1n, 2n, 3n ]);
    const r1 = batchGetter.getBatch(6);
    expect(r1).toMatchObject([ 4n, 5n, 6n, 7n, 8n, 9n ]);
    const r2 = batchGetter.getBatch(4);
    expect(r2).toMatchObject([ 44n, 55n, 70n, 100n ]);
    batchGetter.release(r0);
    batchGetter.release(r1);
    batchGetter.release(r2);
    batchGetter.release([ 33n ] as IPieceId[]);
    batchGetter.recycle([ 2n, 9n, 33n, 100n ] as IPieceId[]);
    expect(holdList.size).toBe(0);
    expect(recycleList.size).toBe(4);
    const r3 = batchGetter.getBatch(6);
    expect(r3).toMatchObject([ 2n, 9n, 33n, 100n, 101n, 102n ]);
    batchGetter.release(r3);
    expect(holdList.size).toBe(0);
    expect(recycleList.size).toBe(0);
  });
});
