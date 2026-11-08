import { Hono } from 'hono';
import { backupSchema } from '@jobdash/shared';
import { backupService } from '../services/backupService';
import { zValidator } from '../validation';

export const backupRoute = new Hono()
  // Export every entity as one JSON document
  .get('/', async (c) => c.json(await backupService.export()))

  // Replace ALL data with the backup contents
  .post('/restore', zValidator('json', backupSchema), async (c) => {
    return c.json({ restored: await backupService.restore(c.req.valid('json')) });
  });
