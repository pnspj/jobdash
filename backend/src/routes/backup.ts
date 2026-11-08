import { Hono } from 'hono';
import { SCHEMA_VERSION, backupSchema, type Backup } from '@jobdash/shared';
import { agentRepository, companyRepository } from '../repositories';
import { batchDelete, batchPut, queryByPrefix } from '../db/operations';
import { BadRequestError } from '../errors';
import { zValidator } from '../validation';

export const backupRoute = new Hono()
  // Export every entity as one JSON document
  .get('/', async (c) => {
    const backup: Backup = {
      app: 'jobdash',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      companies: await companyRepository.list(),
      agents: await agentRepository.list(),
    };
    return c.json(backup);
  })

  // Replace ALL data with the backup contents
  .post('/restore', zValidator('json', backupSchema), async (c) => {
    const backup = c.req.valid('json');
    const agentIds = new Set(backup.agents.map((a) => a.id));
    const dangling = backup.companies.filter((co) => co.agentId && !agentIds.has(co.agentId));
    if (dangling.length > 0) {
      throw new BadRequestError(`存在しないエージェントを参照している企業があります: ${dangling.map((d) => d.companyName).join('、')}`);
    }

    const existing = await queryByPrefix('');
    await batchDelete(existing as { PK: string; SK: string }[]);
    await batchPut([...backup.agents.map(agentRepository.toItem), ...backup.companies.map(companyRepository.toItem)]);
    return c.json({ restored: { companies: backup.companies.length, agents: backup.agents.length } });
  });
