import { Repository } from 'typeorm';
import { PieceEntity } from '@/db/entities/PieceEntity';
import { ThrottleStorePieces } from './ThrottleStorePieces';

describe('ThrottleStorePieces', () => {
  let repoPieces :Repository<PieceEntity>;
  let throttleStorePieces :ThrottleStorePieces;

  beforeEach(() => {
    repoPieces = {
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as Repository<PieceEntity>;
    throttleStorePieces = new ThrottleStorePieces(repoPieces, 2);
  });

  it('stores pieces immediately if drop size is reached', async () => {
    const pieces = [ new PieceEntity(), new PieceEntity() ];
    const promises :Promise<void>[] = [];

    await throttleStorePieces.store(pieces, promises);

    expect(repoPieces.save).toHaveBeenCalledWith(pieces);
  });

  it('stores pieces after timeout if drop size is not reached', async () => {
    jest.useFakeTimers();
    const pieces = [ new PieceEntity() ];
    const promises :Promise<void>[] = [];

    throttleStorePieces.store(pieces, promises);
    jest.runAllTimers();

    expect(repoPieces.save).toHaveBeenCalledWith(pieces);
    jest.useRealTimers();
  });

  it('resolves all promises when pieces are stored', async () => {
    const pieces = [ new PieceEntity(), new PieceEntity() ];
    const promises :Promise<void>[] = [];

    const storePromise = throttleStorePieces.store(pieces, promises);
    await storePromise;

    for (const p of promises) {
      await expect(p).resolves.toBeUndefined();
    }
  });

  it('handles multiple store calls correctly', async () => {
    const pieces1 = [ new PieceEntity() ];
    const pieces2 = [ new PieceEntity() ];
    const promises1 :Promise<void>[] = [];
    const promises2 :Promise<void>[] = [];

    throttleStorePieces.store(pieces1, promises1);
    await throttleStorePieces.store(pieces2, promises2);

    expect(repoPieces.save).toHaveBeenCalledWith([ ...pieces1, ...pieces2 ]);
  });

  it('drops over the drop size by batch.length = 3', async () => {
    const pieces = [ new PieceEntity(), new PieceEntity(), new PieceEntity() ];
    const promises :Promise<void>[] = [];

    await throttleStorePieces.store(pieces, promises);

    expect(repoPieces.save).toHaveBeenCalledWith(pieces.slice(0, 3));
  });

  it('drops over the drop size one by one 3 items', async () => {
    const pieces = [ new PieceEntity(), new PieceEntity(), new PieceEntity() ];
    const promises :Promise<void>[] = [];

    throttleStorePieces.store([ pieces[0] ], promises);
    throttleStorePieces.store([ pieces[1] ], promises);
    throttleStorePieces.store([ pieces[2] ], promises);
    await Promise.all(promises);

    expect(repoPieces.save).toHaveBeenCalledTimes(2);
    expect(repoPieces.save).toHaveBeenCalledWith([ pieces[0], pieces[1] ]);
    expect(repoPieces.save).toHaveBeenCalledWith([ pieces[2] ]);
  });

  it('does not store pieces if no pieces are provided', async () => {
    const promises :Promise<void>[] = [];

    await throttleStorePieces.store([], promises);

    expect(repoPieces.save).not.toHaveBeenCalled();
  });
});
