/** Single-table key design. All items share one partition (single local user). */
export const USER_PK = 'USER#me';

export const ENTITY_TYPES = ['COMPANY'] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const skPrefix = (type: EntityType) => `${type}#`;

export const itemKey = (type: EntityType, id: string) => ({ PK: USER_PK, SK: `${skPrefix(type)}${id}` });

/** Attributes that exist only in DynamoDB and are stripped before returning entities. */
export type KeyAttributes = { PK: string; SK: string; type: EntityType };

export function stripKeys<T>(item: Record<string, unknown>): T {
  const { PK: _pk, SK: _sk, type: _type, ...rest } = item;
  return rest as T;
}
