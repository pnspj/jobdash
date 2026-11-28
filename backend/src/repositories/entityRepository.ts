import { randomUUID } from 'node:crypto';
import { NotFoundError, VersionConflictError } from '../errors';
import { type Data, readData, updateData } from '../store/dataStore';

/** Attributes managed by the repository for every entity. */
export interface EntityMeta {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

type Collection = 'companies' | 'agents' | 'todos';

/**
 * Generic CRUD for one entity collection of the data file.
 * `Input` is the parsed create payload; patches carry `version` for optimistic locking.
 * Returned entities are copies, so callers may modify them freely.
 */
export function createEntityRepository<Entity extends EntityMeta, Input extends object>(
  collection: Collection,
  label: string,
) {
  const items = (data: Data) => data[collection] as unknown as Entity[];
  const build = (input: Input, now: string) =>
    ({ id: randomUUID(), ...input, version: 1, createdAt: now, updatedAt: now }) as unknown as Entity;
  const notFound = () => new NotFoundError(`${label} not found`);

  return {
    async list(): Promise<Entity[]> {
      return structuredClone(items(await readData()));
    },

    async get(id: string): Promise<Entity | undefined> {
      const entity = items(await readData()).find((e) => e.id === id);
      return entity && structuredClone(entity);
    },

    async getOrThrow(id: string): Promise<Entity> {
      const entity = await this.get(id);
      if (!entity) throw notFound();
      return entity;
    },

    create(input: Input): Promise<Entity> {
      return updateData((draft) => {
        const entity = build(input, new Date().toISOString());
        items(draft).push(entity);
        return structuredClone(entity);
      });
    },

    createMany(inputs: Input[]): Promise<Entity[]> {
      return updateData((draft) => {
        const now = new Date().toISOString();
        const entities = inputs.map((input) => build(input, now));
        items(draft).push(...entities);
        return structuredClone(entities);
      });
    },

    /**
     * Apply a partial update with optimistic locking.
     * Keys present in `patch` with null/undefined are removed; absent keys are left untouched.
     */
    update(id: string, patch: { version: number } & Record<string, unknown>): Promise<Entity> {
      return updateData((draft) => {
        const list = items(draft);
        const index = list.findIndex((e) => e.id === id);
        if (index < 0) throw notFound();
        const { version, ...changes } = patch;
        if (list[index].version !== version) throw new VersionConflictError();

        const next: Record<string, unknown> = { ...(list[index] as object) };
        for (const [key, value] of Object.entries(changes)) {
          if (value === null || value === undefined) delete next[key];
          else next[key] = value;
        }
        const updated = { ...next, version: version + 1, updatedAt: new Date().toISOString() } as Entity;
        list[index] = updated;
        return structuredClone(updated);
      });
    },

    delete(id: string): Promise<void> {
      return updateData((draft) => {
        const list = items(draft);
        const index = list.findIndex((e) => e.id === id);
        if (index < 0) throw notFound();
        list.splice(index, 1);
      });
    },

    /** Delete every entity matching `predicate`. Returns the number deleted. */
    deleteWhere(predicate: (entity: Entity) => boolean): Promise<number> {
      return updateData((draft) => {
        const list = items(draft);
        const before = list.length;
        for (let i = list.length - 1; i >= 0; i--) if (predicate(list[i])) list.splice(i, 1);
        return before - list.length;
      });
    },
  };
}
