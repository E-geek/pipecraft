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
    const { bid, input, push, memory } = args;
    const repository = memory[0][0] as Repository<DeduplicatorMemory>;
    const buildingMeta = args.buildingMeta as IBuildingMetaDeduplicator;
    const runConfig = args.runConfig as IBuildingRunConfigMetaDeduplicator;
    let hashFunc = (data :string) => data;
    if (buildingMeta.type !== 'raw') {
      hashFunc = (data :string) => createHash(buildingMeta.type).update(data).digest('hex') as string;
    }
    let getEssential = (data :IPieceMeta) => data;
    if (runConfig.path) {
      getEssential = (data :IPieceMeta) => get(data, runConfig.path!);
    }
    const pass :IPieceMeta[] = [];
    const reject = [];
    for (const piece of input) {
      const { data, pid } = piece;
      const essential = getEssential(data);
      const hash = hashFunc(JSON.stringify(essential));
      let existing = false;
      if (buildingMeta.type === 'raw') {
        existing = await repository.existsBy({ bid, raw: hash });
      } else {
        existing = await repository.existsBy({ bid, hash });
      }
      if (!existing) {
        pass.push(data);
        const record :Partial<DeduplicatorMemory> = {
          bid,
        };
        if (buildingMeta.type === 'raw') {
          record.raw = hash;
        } else {
          record.hash = hash;
        }
        await repository.save(record);
      } else {
        reject.push(pid);
      }
    }
    push(pass);
    // what we should do with reject?
    return {
      okResult: input.map(({ pid }) => pid),
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
