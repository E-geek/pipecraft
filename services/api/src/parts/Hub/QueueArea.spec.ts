import { IPiece, Writable } from '@pipecraft/types';
import { IQueueItem, QueueArea } from './QueueArea';
import { IBuilding, IBuildingState } from '@/parts/Manufacture/Building';
import { IPipe } from '@/parts/Manufacture/Pipe';
import { IManufacture } from '@/parts/Manufacture/Manufacture';

describe('QueueArea', () => {
  let queueArea :QueueArea;
  let building :IBuilding;
  let pipe :IPipe;
  let batch :IPiece[];

  beforeEach(() => {
    queueArea = new QueueArea();
    building = {
      state: 'idle',
      id: BigInt(1),
      buildingTypeId: BigInt(1),
      manufacture: {
        id: BigInt(1),
        isSequential: false,
      } as any,
      isExclusiveBuildingType: false,
      isMiner: false,
      setState(state :IBuildingState) {
        this.state = state;
      },
      isBuildingCanFacility() :boolean {
        return true;
      },
    } as IBuilding;
    pipe = {} as IPipe;
    batch = [ {} as IPiece ];
  });

  it('pushes an item and returns the updated queue area', () => {
    const item :IQueueItem = { building, pipe, batch, nice: 0, vRuntime: -1 };
    const result = queueArea.push(item);
    expect(result).toBe(queueArea);
    expect(queueArea.isEmpty).toBe(false);
  });

  it('throws an error when pushing an item with no manufacture', () => {
    building.manufacture = undefined;
    const item :IQueueItem = { building, pipe, batch, nice: 0, vRuntime: -1 };
    expect(() => queueArea.push(item)).toThrow('Building has no manufacture');
  });

  it('sets vRuntime to 0 for the first item', () => {
    const item :IQueueItem = { building, pipe, batch, nice: 0, vRuntime: -1 };
    queueArea.push(item);
    expect(queueArea.pop([], [])!.vRuntime).toBe(0);
  });

  it('sets vRuntime to the minimum vRuntime in the queue for subsequent items', () => {
    const item1 :IQueueItem = { building, pipe, batch, nice: 0, vRuntime: -1 };
    const item2 :IQueueItem = { ...item1, building: { ...building, id: BigInt(2) }};
    queueArea.push(item1);
    queueArea.push(item2);
    expect(queueArea.pop([], [])!.vRuntime).toBe(0);
    expect(queueArea.pop([], [])!.vRuntime).toBe(0);
  });

  it('returns null when popping from an empty queue', () => {
    expect(queueArea.pop([], [])).toBeNull();
  });

  it('pops the item with the minimum vRuntime', () => {
    const item1 :IQueueItem = { building, pipe, batch, nice: 0, vRuntime: 10 };
    const item2 :IQueueItem = { ...item1, building: { ...building, id: BigInt(2) }, vRuntime: 5 };
    queueArea.push(item1);
    queueArea.push(item2);
    expect(queueArea.pop([], [])!.vRuntime).toBe(5);
    expect(queueArea.pop([], [])!.vRuntime).toBe(10);
  });

  it('skips items with exclusive building type IDs when popping', () => {
    const item1 :IQueueItem = { building, pipe, batch, nice: 0, vRuntime: 10 };
    const item2 :IQueueItem = { ...item1, building: { ...building, id: BigInt(2), buildingTypeId: 2n }, vRuntime: 5 };
    queueArea.push(item1);
    queueArea.push(item2);
    expect(queueArea.pop([ BigInt(1) ], [])!.vRuntime).toBe(5);
  });

  it('skips items with sequential manufacture IDs when popping', () => {
    const item1 :IQueueItem = { building, pipe, batch, nice: 0, vRuntime: 10 };
    const item2 :IQueueItem = {
      building: { ...building, id: 2n, manufacture: { ...building.manufacture, id: 2n } as IManufacture },
      pipe,
      batch,
      nice: 0,
      vRuntime: 5,
    };
    (item1.building.manufacture as Writable<IManufacture>).isSequential = true;
    queueArea.push(item1);
    queueArea.push(item2);
    expect(queueArea.pop([], [ 1n ])!.vRuntime).toBe(5);
  });

  it('calculate new vRuntime', () => {
    const item1 :IQueueItem = { building, pipe, batch, nice: 0, vRuntime: 5 };
    const item2 :IQueueItem = { ...item1, building: { ...building, id: BigInt(2) }, vRuntime: 10, nice: 1 };
    const vRuntime1 = QueueArea.getNewVRuntime(10, item1);
    expect(vRuntime1).toBe(10240 + 5);
    const vRuntime2 = QueueArea.getNewVRuntime(10, item2);
    expect(vRuntime2).toBe(8192 + 10);
  });

  it('check has', () => {
    const item1 :IQueueItem = { building, pipe, batch, nice: 0, vRuntime: 5 };
    queueArea.push(item1);
    expect(queueArea.has(BigInt(1))).toBe(true);
    expect(queueArea.has(BigInt(2))).toBe(false);
  });
});
