import { IPiece, Writable } from '@pipecraft/types';
import { IBuilding } from '@/parts/Manufacture/Building';
import { IPipe } from '@/parts/Manufacture/Pipe';
import { IManufacture } from '@/parts/Manufacture/Manufacture';
import { Facility } from './Facility';

describe('Facility', () => {
  let facility :Facility;
  let building :Writable<IBuilding>;
  let pipe :IPipe;
  let batch :IPiece[];

  beforeEach(() => {
    facility = new Facility(2);
    building = {
      id: BigInt(1),
      buildingTypeId: BigInt(1),
      manufacture: {
        id: BigInt(1),
        isSequential: false,
        mining: jest.fn(),
        pipeTick: jest.fn(),
        pipeTickWithBatch: jest.fn(),
      } as unknown as IManufacture,
      isExclusiveBuildingType: false,
      isMiner: false,
    } as IBuilding;
    pipe = {} as IPipe;
    batch = [ {} as IPiece ];
  });

  it('pushes a building and returns the result', async () => {
    const result = await facility.push({ building, pipe });
    expect(result.building).toBe(building);
    expect(result.pipe).toBe(pipe);
    expect(result.spentTime).toBeGreaterThanOrEqual(0);
  });

  it('throws an error when facility is full over 2', async () => {
    facility.push({ building, pipe });
    const building2 = { ...building, id: BigInt(2) };
    facility.push({ building: building2, pipe });
    const building3 = { ...building, id: BigInt(3) };
    expect(() => facility.push({ building: building3, pipe })).toThrow('Facility is full');
  });

  it('throws an error when building has no manufacture', async () => {
    building.manufacture = undefined;
    expect(() => facility.push({ building, pipe })).toThrow('Building has no manufacture');
  });

  it('throws an error when building type is exclusive and already exists', async () => {
    building.isExclusiveBuildingType = true;
    facility.push({ building, pipe });
    const building2 = { ...building, id: BigInt(2) };
    expect(() => facility.push({ building: building2, pipe })).toThrow('Building type is exclusive, should moved to queue');
  });

  it('throws an error when manufacture is sequential and building is already working from the manufacture', async () => {
    (building.manufacture as Writable<IManufacture>).isSequential = true;
    facility.push({ building, pipe });
    const building2 = { ...building, id: BigInt(2) };
    expect(() => facility.push({ building: building2, pipe })).toThrow('Building is already working from the manufacture');
  });

  it('removes building from workers after work is done', async () => {
    facility.push({ building, pipe });
    expect(facility.size).toBe(1);
    await new Promise(process.nextTick); // wait for async work to complete
    expect(facility.size).toBe(0);
  });

  it('handles batched run correctly', async () => {
    const result = await facility.push({ building, pipe, batch });
    expect(result.building).toBe(building);
    expect(result.pipe).toBe(pipe);
    expect(result.spentTime).toBeGreaterThanOrEqual(0);
  });

  it('throws an error when facility is full', async () => {
    const facility = new Facility(1);
    expect(facility.capacity).toBe(1);
    expect(facility.size).toBe(0);
    facility.push({ building });
    expect(facility.capacity).toBe(1);
    expect(facility.size).toBe(1);
    const building2 = { ...building, id: BigInt(2) };
    expect(() => facility.push({ building: building2 })).toThrow('Facility is full');
  });

  it('test for correct spent time', async () => {
    const facility = new Facility(2);
    building.isMiner = true;
    building.manufacture!.mining = (async () => {
      await new Promise(resolve => setTimeout(resolve, 11));
    }) as any;
    const start = Date.now();
    const result = await facility.push({ building });
    const spentTime = Date.now() - start;
    expect(Math.abs(spentTime - result.spentTime)).toBeLessThan(2);
    expect(spentTime).toBeGreaterThanOrEqual(10);
    expect(spentTime).toBeLessThan(100);
    expect(result.spentTime).toBeGreaterThanOrEqual(10);
    expect(result.spentTime).toBeLessThan(100);
  });

  it('test getExclusives', () => {
    const facility = new Facility(8);
    const building1 :IBuilding = { ...building, id: 4n, isExclusiveBuildingType: true };
    const building2 :IBuilding = { ...building, id: 2n, buildingTypeId: 5n, isExclusiveBuildingType: true };
    const building3 :IBuilding = { ...building, id: 3n, manufacture: { ...(building.manufacture as IManufacture), id: 6n, isSequential: true }};
    facility.push({ building });
    facility.push({ building: building1 });
    facility.push({ building: building2 });
    facility.push({ building: building3 });
    const exclusives = facility.getExclusives();
    expect(exclusives).toHaveLength(2);
    expect(exclusives).toMatchObject([[ 1n, 5n ], [ 6n ]]);
  });

  it('check hasBuilding', () => {
    const facility = new Facility(8);
    const building1 :IBuilding = { ...building, id: 4n, isExclusiveBuildingType: true };
    const building2 :IBuilding = { ...building, id: 2n, buildingTypeId: 5n, isExclusiveBuildingType: true };
    facility.push({ building });
    facility.push({ building: building1 });
    facility.push({ building: building2 });
    expect(facility.hasBuilding(1n)).toBe(true);
    expect(facility.hasBuilding(2n)).toBe(true);
    expect(facility.hasBuilding(3n)).toBe(false);
  });
});
