import { IBuildingTypeType, JsonMap } from '@pipecraft/types';
import { ManufactureEntity } from '@/db/entities/ManufactureEntity';
import { BuildingTypeEntity } from '@/db/entities/BuildingTypeEntity';
import { BuildingEntity } from '@/db/entities/BuildingEntity';
import { UserEntity } from '@/db/entities/UserEntity';
import { BuildingRunConfigEntity } from '@/db/entities/BuildingRunConfigEntity';
import { PipeEntity } from '@/db/entities/PipeEntity';

export interface IManufactureSchemaItemBase {
  meta ?:JsonMap;
  config ?:JsonMap;
  buildingMeta ?:JsonMap;
}

export interface IManufactureSchemaItemMiner extends IManufactureSchemaItemBase {
  /**
   * name is moduleId for buildingType
   */
  miner :string;
}

export interface IManufactureSchemaItemFactory extends IManufactureSchemaItemBase {
  /**
   * name is moduleId for buildingType
   */
  factory :string;
  batch :string;
}

export interface IManufactureSchemaItemPrinter extends IManufactureSchemaItemBase {
  /**
   * name is moduleId for buildingType
   */
  printer :string;
  batch :string;
}

export type IManufactureSchemaItem = IManufactureSchemaItemMiner
  | IManufactureSchemaItemFactory
  | IManufactureSchemaItemPrinter;

export type IManufactureSchema = IManufactureSchemaItem[];

/**
 * namespace for manufacture maker
 */
export class MakeManufacture {
  private static _schemaId = 1;

  /**
   * Make a simple linear manufacture from scheme and receive ManufactureEntity
   * @param schema
   * @example
   * schemaExample :IManufactureSchema = [
   *   {
   *     miner: 'minerTest',  // 'minerTest' is moduleId for buildingType
   *     meta: {              // meta of buildingType
   *       miner: 'minerTest',
   *     },
   *     config: {            // run config
   *       setup: 'setupData',
   *     },
   *   },
   *   {
   *     factory: 'increaseOnTwo',
   *     batch: '10',
   *     meta: {
   *       factory: 'increaseOnTwo',
   *     },
   *   },
   *   {
   *     printer: 'translatorPrinter',
   *     batch: '5',
   *     meta: {
   *       printer: 'translatorPrinter',
   *     },
   *     buildingMeta: {     // meta of building
   *       additional: 'simpleText',
   *     },
   *   },
   * ];
   */
  public static async make(schema :IManufactureSchema) :Promise<ManufactureEntity> {
    const buildingTypes = [];
    const buildings = [];
    const runConfigs = [];
    const pipes = [];
    const owner = await UserEntity.findOneOrFail({ where: {}});
    const title = `Manufacture #${MakeManufacture._schemaId++}`;
    for (const building of schema) {
      let type :IBuildingTypeType = 'logic';
      let moduleId = '';
      let batchSize = '1';
      if ('miner' in building) {
        type = 'miner';
        moduleId = building.miner;
      } else if ('factory' in building) {
        type = 'factory';
        moduleId = building.factory;
        batchSize = building.batch ?? '1';
      } else if ('printer' in building) {
        type = 'printer';
        moduleId = building.printer;
        batchSize = building.batch ?? '1';
      }
      if (type === 'logic') {
        throw new Error('Unknown building type');
      }
      const buildingTypeMeta = building.meta || {};
      const buildingMeta = building.buildingMeta || {};
      const runCongigMeta = building.config || {};
      const buildingType = new BuildingTypeEntity({
        meta: { type, ...buildingTypeMeta },
        moduleId,
        title: `${moduleId} from make #${title}`,
      });
      const buildingEntity = new BuildingEntity({
        owner,
        meta: { ...buildingMeta },
        type: buildingType,
        batchSize,
      });
      const runConfig = new BuildingRunConfigEntity({
        runConfig: runCongigMeta,
        building: buildingEntity,
      });
      buildingTypes.push(buildingType);
      buildings.push(buildingEntity);
      runConfigs.push(runConfig);
    }
    for (let i = 0; i < buildings.length - 1; i++) {
      const buildingEntityFrom = buildings[i];
      const buildingEntityTo = buildings[i + 1];
      pipes.push(new PipeEntity({
        from: buildingEntityFrom,
        to: buildingEntityTo,
      }));
    }
    const manufactureEntity = new ManufactureEntity({
      pipes,
      buildings,
      title,
      owner,
      schedulers: [],
    });

    await BuildingTypeEntity.save(buildingTypes);
    await BuildingEntity.save(buildings);
    await BuildingRunConfigEntity.save(runConfigs);
    await PipeEntity.save(pipes);
    await manufactureEntity.save();

    for (const buildingEntity of buildings) {
      buildingEntity.manufacture = manufactureEntity;
      await buildingEntity.save();
    }
    for (const pipeEntity of pipes) {
      pipeEntity.manufacture = manufactureEntity;
      await pipeEntity.save();
    }
    return manufactureEntity;
  }
}
