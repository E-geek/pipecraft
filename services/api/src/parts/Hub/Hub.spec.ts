import { Repository } from 'typeorm';
import { IBuildingTypeDescriptor } from '@pipecraft/types';
import { PieceEntity } from '@/db/entities/PieceEntity';
import { ManufactureEntity } from '@/db/entities/ManufactureEntity';
import { Hub } from '@/parts/Hub/Hub';
import { ManufactureMaker } from '@/parts/Manufacture/ManufactureMaker';
import { Manufacture } from '@/parts/Manufacture/Manufacture';
import { IBuilding } from '@/parts/Manufacture/Building';


describe('Hub', () => {
  let hub :Hub;
  let repoPieces :Repository<PieceEntity>;
  let repoManufacture :Repository<ManufactureEntity>;
  let buildingTypes :Map<string, IBuildingTypeDescriptor>;

  beforeEach(() => {
    repoPieces = {
      findBy: jest.fn(),
    } as unknown as Repository<PieceEntity>;
    repoManufacture = {
      findBy: jest.fn(),
    } as unknown as Repository<ManufactureEntity>;
    buildingTypes = new Map();
    hub = new Hub({ repoPieces, repoManufacture, buildingTypes });
  });

  it('loads all manufactures successfully', async () => {
    jest.spyOn(repoManufacture, 'findBy').mockResolvedValue([{ mid: BigInt(1) }] as ManufactureEntity[]);
    jest.spyOn(ManufactureMaker, 'loadManufacture').mockResolvedValue({ id: BigInt(1) } as Manufacture);
    const result = await hub.loadAllManufactures();
    expect(result).toBe(hub);
    expect(hub.allManufactures.size).toBe(1);
  });

  it('returns error when loading manufacture fails', async () => {
    jest.spyOn(repoManufacture, 'findBy').mockResolvedValue([{ mid: BigInt(1) }] as ManufactureEntity[]);
    jest.spyOn(ManufactureMaker, 'loadManufacture').mockResolvedValue(new Error('Failed to load'));
    const result = await hub.loadAllManufactures();
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('Failed to load manufacture: Failed to load');
  });

  it('adds building to facility successfully', async () => {
    const building = {
      id: BigInt(1),
      manufacture: { id: BigInt(1), mining: jest.fn() } as unknown as Manufacture,
      isMiner: true,
      setState: jest.fn(),
      isBuildingCanFacility: () => true,
    } as unknown as IBuilding;
    jest.spyOn(hub['_facility'], 'hasBuilding').mockReturnValue(false);
    jest.spyOn(hub['_queueArea'], 'has').mockReturnValue(false);
    jest.spyOn(hub['_queueArea'], 'push');
    await hub.addBuildingToFacility(building);
    expect(hub['_queueArea'].push).toHaveBeenCalled();
  });

  it('throws error when adding building without manufacture', async () => {
    const building = { id: BigInt(1), manufacture: undefined, isMiner: true } as IBuilding;
    await expect(hub.addBuildingToFacility(building)).rejects.toThrow('Building has no manufacture');
  });

  it('throws error when adding non-miner building without pipe', async () => {
    const building = { id: BigInt(1), manufacture: { id: BigInt(1) }, isMiner: false } as IBuilding;
    await expect(hub.addBuildingToFacility(building)).rejects.toThrow('pipe is required for non-miner building');
  });

  it('waits for manufacture to finish', async () => {
    const mid = BigInt(1);
    jest.spyOn(hub as any, '_checkManufactureIsWorking').mockReturnValue(false);
    const promise = hub.waitForFinish(mid);
    await expect(promise).resolves.toBeUndefined();
  });

  it('adds to waiters list if manufacture is working', async () => {
    const mid = BigInt(1);
    jest.spyOn(hub as any, '_checkManufactureIsWorking').mockReturnValue(true);
    hub.waitForFinish(mid);
    expect(hub['_manufactureFinishWaiters'].get(mid)).toHaveLength(1);
  });
});
