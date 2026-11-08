import { Hono } from 'hono';
import { companyImportSchema, companyInputSchema, companyPatchSchema } from '@jobdash/shared';
import { companyRepository } from '../repositories/companyRepository';
import { NotFoundError } from '../errors';
import { zValidator } from '../validation';

export const companiesRoute = new Hono()
  .get('/', async (c) => c.json(await companyRepository.list()))

  .get('/:id', async (c) => {
    const company = await companyRepository.get(c.req.param('id'));
    if (!company) throw new NotFoundError('Company not found');
    return c.json(company);
  })

  .post('/', zValidator('json', companyInputSchema), async (c) => {
    return c.json(await companyRepository.create(c.req.valid('json')), 201);
  })

  // Bulk create (CSV import). The whole request is rejected if any record is invalid.
  .post('/import', zValidator('json', companyImportSchema), async (c) => {
    const created = await companyRepository.createMany(c.req.valid('json').records);
    return c.json({ imported: created.length }, 201);
  })

  .patch('/:id', zValidator('json', companyPatchSchema), async (c) => {
    return c.json(await companyRepository.update(c.req.param('id'), c.req.valid('json')));
  })

  .delete('/:id', async (c) => {
    await companyRepository.delete(c.req.param('id'));
    return c.body(null, 204);
  });
