import { Hono } from 'hono';
import { SCHEMA_VERSION, backupSchema, type Backup } from '@jobdash/shared';
import { companyRepository } from '../repositories/companyRepository';
import { itemKey } from '../db/keys';
import { batchDelete, batchPut, queryByPrefix } from '../db/operations';
import { zValidator } from '../validation';

export const backupRoute = new Hono()
  // Export every entity as one JSON document
  .get('/', async (c) => {
    const backup: Backup = {
      app: 'jobdash',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      companies: await companyRepository.list(),
    };
    return c.json(backup);
  })

  // Replace ALL data with the backup contents
  .post('/restore', zValidator('json', backupSchema), async (c) => {
    const backup = c.req.valid('json');
    const existing = await queryByPrefix('');
    await batchDelete(existing as { PK: string; SK: string }[]);
    await batchPut(backup.companies.map((co) => ({ ...itemKey('COMPANY', co.id), type: 'COMPANY', ...co })));
    return c.json({ restored: { companies: backup.companies.length } });
  });
