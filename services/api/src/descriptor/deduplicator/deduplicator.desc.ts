import { createHash } from 'node:crypto';
import {
  IBuildingMeta,
  IBuildingRunConfigMeta,
  IBuildingTypeDescriptor,
  IBuildingTypeExport,
  IPiece,
  IPieceMeta,
} from '@pipecraft/types';
import { get } from 'lodash';
import { Repository } from 'typeorm';
import { DeduplicatorMemory } from './DeduplicatorMemory';
import { Migrations1739919632856 } from'./migrations';

export interface IBuildingMetaDeduplicator extends IBuildingMeta {
  type :'raw' | 'sha256';
}

export interface IBuildingRunConfigMetaDeduplicator extends IBuildingRunConfigMeta {
  path :string | null;
}

const title = 'Deduplicator';

const descriptor :IBuildingTypeDescriptor<IPiece, IPieceMeta> = {
  gear: async (args) => {
    const { input, push, memory } = args;
    const repository = memory[0][0] as Repository<DeduplicatorMemory>;
    const buildingMeta = args.buildingMeta as IBuildingMetaDeduplicator;
    const runConfig = args.runConfig as IBuildingRunConfigMetaDeduplicator;
    let hashFunc = (data :string) => data;
    if (buildingMeta.type !== 'raw') {
      hashFunc = (data :string) => createHash('sha256').update(data).digest('hex') as string;
    }
    let getEssential = (data :IPieceMeta) => data;
    if (runConfig.path) {
      getEssential = (data :IPieceMeta) => get(data, runConfig.path!);
    }
    for (const piece of input) {
      const { data } = piece;
      const essential = getEssential(data);
      const hash = hashFunc(JSON.stringify(essential));
      if (buildingMeta.type === 'raw') {
        const existing = await repository.existsBy({ raw: hash });
        // to be continued
      }
    }
    return {
      okResult: deduped.map(({ pid }) => pid),
      errorResult: [],
      errorLogs: [],
    };
  },
};

export const type :IBuildingTypeExport<IPiece, IPieceMeta> = {
  title,
  descriptor,
  entities: [ DeduplicatorMemory ],
  migrations: [ Migrations1739919632856 ],
};
