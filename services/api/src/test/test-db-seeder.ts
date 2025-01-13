// noinspection ES6PreferShortImport

import { DataSource, QueryRunner } from 'typeorm';
import { IBuildingTypeType } from '@pipecraft/types';
import { UserEntity } from '../db/entities/UserEntity';
import { BuildingTypeEntity } from '../db/entities/BuildingTypeEntity';
import { BuildingEntity } from '../db/entities/BuildingEntity';
import { BuildingRunConfigEntity } from '../db/entities/BuildingRunConfigEntity';
import { PipeEntity } from '../db/entities/PipeEntity';

export class TestDBSeeder {
  private _db :DataSource;
  private _listMinimalPipe = [ 'miner', 'factory', 'printer' ] as IBuildingTypeType[];

  constructor(dataSource :DataSource) {
    this._db = dataSource;
  }

  public async createUser(queryRunner :QueryRunner) {
    const user = new UserEntity();
    user.email = 'test@pipecraft.tech';
    user.password = UserEntity.getPasswordHash('password', 'test');
    user.name = 'Tester Testerovich';
    user.isVerified = true;
    user.meta = {};
    const userRow = await queryRunner.manager.save(user);
    return userRow.uid;
  }

  public async createAllBuildingType(queryRunner :QueryRunner) {
    const result = {} as Record<IBuildingTypeType, bigint>;
    for (const name of this._listMinimalPipe) {
      const buildingType = new BuildingTypeEntity();
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
    const user = await queryRunner.manager.findOne(UserEntity, { where: { uid }});
    if (!user) {
      throw new Error('User not found, but MUST BE');
    }
    const buildings = new Map<IBuildingTypeType, BuildingEntity>();
    for (const name of this._listMinimalPipe) {
      const building = new BuildingEntity();
      building.batchSize = '1';
      building.input = Promise.resolve(null);
      building.output = Promise.resolve(null);
      building.meta = {
        'test': 'test',
      };
      const buildingType = await queryRunner.manager.findOneBy(BuildingTypeEntity, { btid: ids[name] });
      if (!buildingType) {
        throw new Error('BuildingType not found, but MUST BE');
      }
      building.type = buildingType;
      building.owner = user;
      const buildingRow = await queryRunner.manager.save(building);
      buildings.set(name, buildingRow);
      const runConfig = new BuildingRunConfigEntity();
      runConfig.building = buildingRow;
      runConfig.runConfig = {
        test: 'test',
      };
      await queryRunner.manager.save(runConfig);
    }
    const pipeMemoryMF = new PipeEntity();
    const miner = buildings.get('miner')!;
    const factory = buildings.get('factory')!;
    const printer = buildings.get('printer')!;
    pipeMemoryMF.from = miner;
    pipeMemoryMF.to = factory;
    const pipeMemoryFP = new PipeEntity();
    pipeMemoryFP.from = factory;
    pipeMemoryFP.to = printer;
    factory.input = Promise.resolve(miner);
    printer.input = Promise.resolve(factory);
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
