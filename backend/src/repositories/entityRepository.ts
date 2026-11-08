import { randomUUID } from 'node:crypto';
import { DeleteCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { docClient, TABLE_NAME } from '../db/client';
import { itemKey, skPrefix, stripKeys, type EntityType } from '../db/keys';
import { batchPut, queryByPrefix } from '../db/operations';
import { NotFoundError, VersionConflictError } from '../errors';

/** Attributes managed by the repository for every entity. */
export interface EntityMeta {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Generic CRUD for one entity type in the single table (SK = `<TYPE>#<id>`).
 * `Input` is the parsed create payload; patches carry `version` for optimistic locking.
 */
export function createEntityRepository<Entity extends EntityMeta, Input extends object>(type: EntityType, label: string) {
  const toItem = (e: Entity): Record<string, unknown> => ({ ...itemKey(type, e.id), type, ...(e as object) });
  const build = (input: Input, now: string) =>
    ({ id: randomUUID(), ...input, version: 1, createdAt: now, updatedAt: now }) as unknown as Entity;

  return {
    /** Rebuild the DynamoDB item for an entity (used by backup restore). */
    toItem,

    async list(): Promise<Entity[]> {
      return (await queryByPrefix(skPrefix(type))).map((i) => stripKeys<Entity>(i));
    },

    async get(id: string): Promise<Entity | undefined> {
      const res = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: itemKey(type, id) }));
      return res.Item ? stripKeys<Entity>(res.Item) : undefined;
    },

    async getOrThrow(id: string): Promise<Entity> {
      const entity = await this.get(id);
      if (!entity) throw new NotFoundError(`${label} not found`);
      return entity;
    },

    async create(input: Input): Promise<Entity> {
      const entity = build(input, new Date().toISOString());
      await docClient.send(
        new PutCommand({ TableName: TABLE_NAME, Item: toItem(entity), ConditionExpression: 'attribute_not_exists(PK)' }),
      );
      return entity;
    },

    async createMany(inputs: Input[]): Promise<Entity[]> {
      const now = new Date().toISOString();
      const entities = inputs.map((input) => build(input, now));
      await batchPut(entities.map(toItem));
      return entities;
    },

    /**
     * Apply a partial update with optimistic locking.
     * Keys present in `patch` with null/undefined are removed; absent keys are left untouched.
     */
    async update(id: string, patch: { version: number } & Record<string, unknown>): Promise<Entity> {
      const current = await this.getOrThrow(id);
      const { version, ...changes } = patch;
      if (current.version !== version) throw new VersionConflictError();

      const next: Record<string, unknown> = { ...(current as object) };
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === undefined) delete next[key];
        else next[key] = value;
      }
      const updated = { ...next, version: version + 1, updatedAt: new Date().toISOString() } as Entity;

      try {
        await docClient.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: toItem(updated),
            ConditionExpression: 'version = :v',
            ExpressionAttributeValues: { ':v': version },
          }),
        );
      } catch (err) {
        if (err instanceof ConditionalCheckFailedException) throw new VersionConflictError();
        throw err;
      }
      return updated;
    },

    async delete(id: string): Promise<void> {
      try {
        await docClient.send(
          new DeleteCommand({ TableName: TABLE_NAME, Key: itemKey(type, id), ConditionExpression: 'attribute_exists(PK)' }),
        );
      } catch (err) {
        if (err instanceof ConditionalCheckFailedException) throw new NotFoundError(`${label} not found`);
        throw err;
      }
    },
  };
}
