import { resumePutSchema } from '@jobdash/shared';
import { Hono } from 'hono';
import { resumeRepository } from '../repositories/resumeRepository';
import { zValidator } from '../validation';

export const resumeRoute = new Hono()
  .get('/', async (c) => c.json(await resumeRepository.get()))

  .put('/', zValidator('json', resumePutSchema), async (c) => {
    const { version, ...content } = c.req.valid('json');
    return c.json(await resumeRepository.put(content, version));
  });
