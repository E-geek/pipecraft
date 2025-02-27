import { IBuildingTypeDescriptor, IBuildingTypeExport, IPiece, IPieceMeta } from '@pipecraft/types';

const title = 'Code';

const descriptor :IBuildingTypeDescriptor<IPiece, IPieceMeta> = {
  gear: async (args) => {
    const { input, push, runConfig } = args;
    try {
      const funcCode = runConfig.code as string;
      const func = new Function('input', funcCode);
      const result = await func(input);
      if (Array.isArray(result)) {
        await push(result);
      } else {
        // noinspection ExceptionCaughtLocallyJS
        throw new Error('Code must return an array');
      }
    } catch (err) {
      return {
        okResult: [],
        errorResult: [ ...input.map(({ pid }) => pid) ],
        logs: [{ level: 'ERROR', message: err.message }],
      };
    }
    return {
      okResult: [ ...input.map(({ pid }) => pid) ],
      errorResult: [],
      logs: [],
    };
  },
};

export const type :IBuildingTypeExport<IPiece, IPieceMeta> = { title, descriptor };
