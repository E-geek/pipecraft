import { Loop } from '@/parts/Hub/Loop';

describe('Loop', () => {
  it('simple test', () => {
    const loop = new Loop([ 1, 2, 3 ]);
    expect(loop.size).toBe(3);
    expect(loop.next()).toBe(1); // [ (1), 2, 3 ] -> [ 1, (2), 3 ] -> [ 1, 2, (3) ] -> [ (1), 2, 3 ]
    expect(loop.next()).toBe(2);
    expect(loop.next()).toBe(3);
    expect(loop.next()).toBe(1);
    expect(loop.next()).toBe(2); // [ 1, (2), 3 ] -> [ 1, 2, (3) ]
    loop.add(4);                         // [ 1, 2, 4, (3) ]
    expect(loop.size).toBe(4);
    expect(loop.next()).toBe(3); // [ 1, 2, 4, (3) ] -> [ (1), 2, 4, 3 ]
    expect(loop.next()).toBe(1); // [ (1), 2, 4, 3 ] -> [ 1, (2), 4, 3 ]
    expect(loop.next()).toBe(2); // [ 1, (2), 4, 3 ] -> [ 1, 2, (4), 3 ]
    expect(loop.next()).toBe(4); // [ 1, 2, (4), 3 ] -> [ 1, 2, 4, (3) ]
    loop.remove(2);                 // [ 1, 4, (3) ]
    expect(loop.size).toBe(3);
    expect(loop.next()).toBe(3); // [ 1, 4, (3) ] -> [ (1), 4, 3 ]
    expect(loop.next()).toBe(1); // [ (1), 4, 3 ] -> [ 1, (4), 3 ]
    expect(loop.next()).toBe(4); // [ 1, (4), 3 ] -> [ 1, 4, (3) ]
    loop.remove(3);                 // [ (1), 4 ]
    expect(loop.size).toBe(2);
    expect(loop.isEmpty).toBe(false);
    loop.remove(1);                 // [ (4) ]
    expect(loop.next()).toBe(4);
    expect(loop.next()).toBe(4);
    loop.remove(4);                 // [ ]
    expect(loop.size).toBe(0);
    expect(loop.isEmpty).toBe(true);
    expect(loop.next()).toBe(undefined);
    loop.add(8);                         // [ (8) ]
    loop.add(6);                         // [ 7, (8) ]
    loop.add(7);                         // [ 6, 7, (8) ]
    expect(loop.size).toBe(3);
    expect(loop.next()).toBe(8); // [ 6, 7, (8) ] -> [ (6), 7, 8 ]
    expect(loop.next()).toBe(6); // [ (6), 7, 8 ] -> [ 6, (7), 8 ]
    expect(loop.next()).toBe(7); // [ 6, (7), 8 ] -> [ 6, 7, (8) ]
    expect(loop.next()).toBe(8); // [ 6, 7, (8) ] -> [ (6), 7, 8 ]
    loop.clear();
    expect(loop.size).toBe(0);
    expect(loop.isEmpty).toBe(true);
    expect(loop.next()).toBe(undefined);
  });

  it('test for has', () => {
    const loop = new Loop([ 1, 2, 3 ]);
    expect(loop.has(1)).toBe(true);
    expect(loop.has(2)).toBe(true);
    expect(loop.has(3)).toBe(true);
    expect(loop.has(4)).toBe(false);
    loop.add(4);
    expect(loop.has(4)).toBe(true);
    loop.remove(4);
    expect(loop.has(4)).toBe(false);
  });

  it('only item', () => {
    const loop = new Loop();
    loop.add(789);
    const x = loop.next();
    expect(x).toBe(789);
    expect(loop.isEmpty).toBe(false);
  });
});
