import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BuildingEntity } from '@/db/entities/BuildingEntity';
import { ManufactureEntity } from '@/db/entities/ManufactureEntity';
import { PieceEntity } from '@/db/entities/PieceEntity';
import { RunReportEntity } from '@/db/entities/RunReportEntity';
import { ManufactureService } from './manufacture.service';
import { BureauService } from '@/bureau/bureau.service';
import { getTestDBConf } from '@/test/db.conf';

describe('ManufactureService', () => {
  let service :ManufactureService;
  let bureauService :BureauService;
  let buildingRepo :Repository<BuildingEntity>;
  // let manufactureRepo :Repository<ManufactureEntity>;
  // let pieceRepo :Repository<PieceEntity>;
  // let runReportRepo :Repository<RunReportEntity>;

  beforeEach(async () => {
    const module :TestingModule = await Test.createTestingModule({
      providers: [
        ManufactureService,
        {
          provide: BureauService,
          useValue: {
            getBuildingTypes: jest.fn().mockReturnValue(new Map()),
          },
        },
      ],
      imports: [
        TypeOrmModule.forRoot(getTestDBConf()),
        TypeOrmModule.forFeature([
          BuildingEntity,
          ManufactureEntity,
          PieceEntity,
          RunReportEntity,
        ]),
      ],
    }).compile();

    service = module.get<ManufactureService>(ManufactureService);
    bureauService = module.get<BureauService>(BureauService);
    buildingRepo = module.get<Repository<BuildingEntity>>(getRepositoryToken(BuildingEntity));
    // manufactureRepo = module.get<Repository<ManufactureEntity>>(getRepositoryToken(ManufactureEntity));
    // pieceRepo = module.get<Repository<PieceEntity>>(getRepositoryToken(PieceEntity));
    // runReportRepo = module.get<Repository<RunReportEntity>>(getRepositoryToken(RunReportEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(bureauService).toBeDefined();
  });

  it('addBuildingToQueue should throw error if building not found', async () => {
    jest.spyOn(buildingRepo, 'findOne').mockResolvedValue(null);
    await expect(service.addBuildingToQueue(1n)).rejects.toThrow('Building with ID 1 not found');
  });

  it('addBuildingToQueue should throw error if building has no manufacture', async () => {
    jest.spyOn(buildingRepo, 'findOne').mockResolvedValue({ bid: 1n, manufacture: null } as any);
    await expect(service.addBuildingToQueue(1n)).rejects.toThrow('Building with ID 1 has no manufacture');
  });

  it('addBuildingToQueue should throw error if manufacture not found', async () => {
    const building = { bid: 1n, manufacture: { mid: 1n }} as any;
    jest.spyOn(buildingRepo, 'findOne').mockResolvedValue(building);
    jest.spyOn(service['_hub'].allManufactures, 'get').mockReturnValue(undefined);
    await expect(service.addBuildingToQueue(1n)).rejects.toThrow('Manufacture with ID 1 not found');
  });

  it('addBuildingToQueue should throw error if building not found in manufacture', async () => {
    const building = { bid: 1n, manufacture: { mid: 1n }} as any;
    const manufacture = { getBuilding: jest.fn().mockReturnValue(null) } as any;
    jest.spyOn(buildingRepo, 'findOne').mockResolvedValue(building);
    jest.spyOn(service['_hub'].allManufactures, 'get').mockReturnValue(manufacture);
    await expect(service.addBuildingToQueue(1n)).rejects.toThrow('Building with ID 1 not found in manufacture 1');
  });

  it.skip('addBuildingToQueue should add miner building to facility', async () => {
    const building = {
      bid: 1n,
      isMiner: true,
      isBuildingCanFacility: jest.fn().mockReturnValue(true),
      setState: jest.fn().mockReturnValue(undefined),
    } as any;
    const manufacture = {
      getBuilding: jest.fn().mockReturnValue(building),
      mining: jest.fn().mockResolvedValue({ okResult: []}),
    } as any;
    building.manufacture = manufacture;
    jest.spyOn(buildingRepo, 'findOne').mockResolvedValue(building);
    jest.spyOn(service['_hub'].allManufactures, 'get').mockReturnValue(manufacture);
    const addBuildingToFacilitySpy = jest.spyOn(service['_hub'], 'addBuildingToFacility');
    await service.addBuildingToQueue(1n);
    expect(addBuildingToFacilitySpy).toHaveBeenCalledWith(building);
  });

  it.skip('addBuildingToQueue should add non-miner building to facility with pipes', async () => {
    const building = {
      bid: 1n,
      isMiner: false,
      isBuildingCanFacility: jest.fn().mockReturnValue(true),
      setState: jest.fn().mockReturnValue(undefined),
    } as any;
    const pipe = {} as any;
    const manufacture = {
      getBuilding: jest.fn().mockReturnValue(building),
      getPipesTo: jest.fn().mockReturnValue([ pipe ]),
      mining: jest.fn().mockResolvedValue({ okResult: []}),
    } as any;
    building.manufacture = manufacture;
    jest.spyOn(buildingRepo, 'findOne').mockResolvedValue(building);
    jest.spyOn(service['_hub'].allManufactures, 'get').mockReturnValue(manufacture);
    const addBuildingToFacilitySpy = jest.spyOn(service['_hub'], 'addBuildingToFacility');
    await service.addBuildingToQueue(1n);
    expect(addBuildingToFacilitySpy).toHaveBeenCalledWith(building, pipe);
  });
});
