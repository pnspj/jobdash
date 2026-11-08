import { agentInputSchema, agentPatchSchema } from '@jobdash/shared';
import { Hono } from 'hono';
import { agentService } from '../services/agentService';
import { zValidator } from '../validation';

export const agentsRoute = new Hono()
  .get('/', async (c) => c.json(await agentService.list()))

  .get('/:id', async (c) => c.json(await agentService.get(c.req.param('id'))))

  .post('/', zValidator('json', agentInputSchema), async (c) => {
    return c.json(await agentService.create(c.req.valid('json')), 201);
  })

  .patch('/:id', zValidator('json', agentPatchSchema), async (c) => {
    return c.json(await agentService.update(c.req.param('id'), c.req.valid('json')));
  })

  .delete('/:id', async (c) => {
    await agentService.delete(c.req.param('id'));
    return c.body(null, 204);
  });
