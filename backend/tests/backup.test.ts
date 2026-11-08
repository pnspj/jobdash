import { beforeEach, expect, test } from 'vitest';
import type { Backup, Company } from '@jobdash/shared';
import { call, clearTable } from './helpers';

const company = {
  companyName: 'A社',
  agent: 'RA',
  phase: '一次面接',
  action: '要対応',
  nextActionAt: '2026-11-10',
};

beforeEach(clearTable);

test('export then restore replaces all data with the backup', async () => {
  const { body: a } = await call<Company>('POST', '/api/companies', company);
  const { body: backup } = await call<Backup>('GET', '/api/backup');
  expect(backup).toMatchObject({ app: 'jobdash', schemaVersion: 2, companies: [a] });

  // Change data after the backup
  await call('POST', '/api/companies', { ...company, companyName: 'B社' });
  await call('DELETE', `/api/companies/${a.id}`);

  const restored = await call<{ restored: { companies: number } }>('POST', '/api/backup/restore', backup);
  expect(restored.status).toBe(200);
  expect(restored.body.restored.companies).toBe(1);
  expect((await call<Company[]>('GET', '/api/companies')).body).toEqual([a]);
});

test('restore rejects an invalid backup and keeps existing data', async () => {
  await call('POST', '/api/companies', company);
  const res = await call('POST', '/api/backup/restore', { app: 'jobdash', schemaVersion: 1, exportedAt: '', companies: [] });
  expect(res.status).toBe(400);
  expect((await call<Company[]>('GET', '/api/companies')).body).toHaveLength(1);
});
