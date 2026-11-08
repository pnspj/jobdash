import { todoInputSchema, todoListQuerySchema, todoPatchSchema } from '@jobdash/shared';
import { Hono } from 'hono';
import { todoService } from '../services/todoService';
import { zValidator } from '../validation';

export const todosRoute = new Hono()
  // ?agentId=<id> for one agent's to-dos, ?scope=dashboard for to-dos without an agent
  .get('/', zValidator('query', todoListQuerySchema), async (c) => c.json(await todoService.list(c.req.valid('query'))))

  .get('/:id', async (c) => c.json(await todoService.get(c.req.param('id'))))

  .post('/', zValidator('json', todoInputSchema), async (c) => {
    return c.json(await todoService.create(c.req.valid('json')), 201);
  })

  .patch('/:id', zValidator('json', todoPatchSchema), async (c) => {
    return c.json(await todoService.update(c.req.param('id'), c.req.valid('json')));
  })

  .delete('/:id', async (c) => {
    await todoService.delete(c.req.param('id'));
    return c.body(null, 204);
  });
