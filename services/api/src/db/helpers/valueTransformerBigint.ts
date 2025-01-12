import { ValueTransformer } from 'typeorm';

export const valueTransformerBigint :ValueTransformer = {
  to: (entityValue :bigint | null) => entityValue,
  from: (databaseValue :string | null) :bigint | null => databaseValue == null ? null : BigInt(databaseValue)
};
