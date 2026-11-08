import { Hono } from 'hono';
import { z } from 'zod';
import { batchDelete, queryByPrefix } from '../db/operations';
import { zValidator } from '../validation';

/** Guard against accidental calls: the caller must state the intent explicitly. */
const confirmQuery = z.object({ confirm: z.literal('DELETE_ALL', '?confirm=DELETE_ALL が必要です') });

export const dataRoute = new Hono()
  // Delete EVERY item of the user (companies, agents, ...)
  .delete('/', zValidator('query', confirmQuery), async (c) => {
    const items = await queryByPrefix('');
    const counts: Record<string, number> = {};
    for (const item of items) {
      const type = String(item.type ?? 'UNKNOWN').toLowerCase();
      counts[type] = (counts[type] ?? 0) + 1;
    }
    await batchDelete(items as { PK: string; SK: string }[]);
    return c.json({
      deleted: {
        companies: counts.company ?? 0,
        agents: counts.agent ?? 0,
        todos: counts.todo ?? 0,
        resume: counts.resume ?? 0,
        total: items.length,
      },
    });
  });
