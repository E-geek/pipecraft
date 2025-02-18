import { globSync } from 'fast-glob';
import { Injectable } from '@nestjs/common';
import { IBuildingTypeExport } from '@pipecraft/types';

export interface IBureauOptions {
  path :(string|IBuildingTypeExport)[];
}

@Injectable()
export class BureauService {
  private _listBuildingTypes :IBuildingTypeExport[];

  constructor(options :IBureauOptions) {
    const mix = options.path;
    const listBuildingTypes :IBuildingTypeExport[] = mix.filter((pathOrBT) => typeof pathOrBT !== 'string');
    const paths = globSync(
      mix.filter((pathOrBT) => typeof pathOrBT === 'string'),
      {
        onlyFiles: true,
        absolute: true,
      }
    );
    for (const path of paths) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const buildingTypeExport = require(path) as {type :IBuildingTypeExport};
      if (!buildingTypeExport.type) {
        throw new Error(`Building type export must have a type field for ${path}`);
      }
      listBuildingTypes.push(buildingTypeExport.type);
    }
    this._listBuildingTypes = listBuildingTypes;
  }

  getEntities() :IBuildingTypeExport['entities'] {
    return this._listBuildingTypes.map(({ entities }) => entities).flat() as string[];
  }

  getMigrations() :IBuildingTypeExport['migrations'] {
    return this._listBuildingTypes.map(({ migrations }) => migrations).flat() as string[];
  }
}
