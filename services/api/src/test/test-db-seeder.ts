import { DataSource, QueryRunner } from 'typeorm';
import { IBuildingTypeType } from '@pipecraft/types';
import { User } from '../db/entities/User';
import { BuildingType } from '../db/entities/BuildingType';
import { Building } from '../db/entities/Building';
import { BuildingRunConfig } from '../db/entities/BuildingRunConfig';
import { PipeMemory } from '../db/entities/PipeMemory';

export class TestDBSeeder {
  private _db :DataSource;
  private _listMinimalPipe = [ 'miner', 'factory', 'printer' ] as IBuildingTypeType[];

  constructor(dataSource :DataSource) {
    this._db = dataSource;
  }

  public async createUser(queryRunner :QueryRunner) {
    const user = new User();
    user.email = 'test@pipecraft.tech';
    user.password = User.getPasswordHash('password', 'test');
    user.name = 'Tester Testerovich';
    user.isVerified = true;
    user.meta = {};
    const userRow = await queryRunner.manager.save(user);
    return userRow.uid;
  }

  public async createAllBuildingType(queryRunner :QueryRunner) {
    const result = {} as Record<IBuildingTypeType, bigint>;
    for (const name of this._listMinimalPipe) {
      const buildingType = new BuildingType();
      buildingType.title = `${name} #0`;
      buildingType.moduleId = `${name}Test`;
      buildingType.meta = {
        type: name,
      };
      // save
      const buildingRow = await queryRunner.manager.save(buildingType);
      result[name] = buildingRow.btid;
    }

    return result;
  }

  public async createBootstrapBlueprint(queryRunner :QueryRunner, uid :string, ids :Record<IBuildingTypeType, bigint>) {
    const user = await queryRunner.manager.findOne(User, { where: { uid }});
    if (!user) {
      throw new Error('User not found, but MUST BE');
    }
    const buildings = new Map<IBuildingTypeType, Building>();
    for (const name of this._listMinimalPipe) {
      const building = new Building();
      building.batchSize = '1';
      building.input = null;
      building.output = null;
      building.meta = {
        'test': 'test',
      };
      const buildingType = await queryRunner.manager.findOneBy(BuildingType, { btid: ids[name] });
      if (!buildingType) {
        throw new Error('BuildingType not found, but MUST BE');
      }
      building.type = buildingType;
      building.owner = user;
      const buildingRow = await queryRunner.manager.save(building);
      buildings.set(name, buildingRow);
      const runConfig = new BuildingRunConfig();
      runConfig.building = buildingRow;
      runConfig.runConfig = {
        test: 'test',
      };
      await queryRunner.manager.save(runConfig);
    }
    const pipeMemoryMF = new PipeMemory();
    const miner = buildings.get('miner')!;
    const factory = buildings.get('factory')!;
    const printer = buildings.get('printer')!;
    pipeMemoryMF.from = miner;
    pipeMemoryMF.to = factory;
    const pipeMemoryFP = new PipeMemory();
    pipeMemoryFP.from = factory;
    pipeMemoryFP.to = printer;
    factory.input = miner;
    printer.input = factory;
    await Promise.all([
      queryRunner.manager.save(pipeMemoryMF),
      queryRunner.manager.save(pipeMemoryFP),
      queryRunner.manager.save(factory),
      queryRunner.manager.save(printer),
    ]);
  }

  public async seed() {
    const queryRunner = this._db.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const uid = await this.createUser(queryRunner);
      const buildingTypesIds = await this.createAllBuildingType(queryRunner);
      await this.createBootstrapBlueprint(queryRunner, uid, buildingTypesIds);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
