import { Hono } from 'hono';
import { companyImportSchema, companyInputSchema, companyPatchSchema } from '@jobdash/shared';
import { companyService } from '../services/companyService';
import { zValidator } from '../validation';

export const companiesRoute = new Hono()
  .get('/', async (c) => c.json(await companyService.list()))

  .get('/:id', async (c) => c.json(await companyService.get(c.req.param('id'))))

  .post('/', zValidator('json', companyInputSchema), async (c) => {
    return c.json(await companyService.create(c.req.valid('json')), 201);
  })

  // Bulk create (CSV import). The whole request is rejected if any record is invalid.
  .post('/import', zValidator('json', companyImportSchema), async (c) => {
    return c.json(await companyService.import(c.req.valid('json').records), 201);
  })

  .patch('/:id', zValidator('json', companyPatchSchema), async (c) => {
    return c.json(await companyService.update(c.req.param('id'), c.req.valid('json')));
  })

  .delete('/:id', async (c) => {
    await companyService.delete(c.req.param('id'));
    return c.body(null, 204);
  });
