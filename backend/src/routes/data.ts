import { Hono } from 'hono';
import { z } from 'zod';
import { dataFile, emptyData, updateData } from '../store/dataStore';
import { zValidator } from '../validation';

/** Guard against accidental calls: the caller must state the intent explicitly. */
const confirmQuery = z.object({ confirm: z.literal('DELETE_ALL', '?confirm=DELETE_ALL が必要です') });

export const dataRoute = new Hono()
  // Where the data is stored (shown on the settings page)
  .get('/', (c) => c.json({ file: dataFile() }))

  // Delete ALL data (companies, agents, ...)
  .delete('/', zValidator('query', confirmQuery), async (c) => {
    const deleted = await updateData((draft) => {
      const counts = {
        companies: draft.companies.length,
        agents: draft.agents.length,
        todos: draft.todos.length,
        resume: draft.resume ? 1 : 0,
      };
      Object.assign(draft, emptyData());
      delete draft.resume;
      return { ...counts, total: counts.companies + counts.agents + counts.todos + counts.resume };
    });
    return c.json({ deleted });
  });
