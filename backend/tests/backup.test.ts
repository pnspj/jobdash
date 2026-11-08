import type { Agent, Backup, Company } from '@jobdash/shared';
import { beforeEach, expect, test } from 'vitest';
import { call, clearTable } from './helpers';

const company = {
  companyName: 'A社',
  phase: '一次面接',
  action: '要対応',
  nextActionAt: '2026-11-10',
};

beforeEach(clearTable);

test('export then restore replaces all data with the backup', async () => {
  const { body: agent } = await call<Agent>('POST', '/api/agents', { name: '△△エージェント', shortName: 'SA' });
  const { body: a } = await call<Company>('POST', '/api/companies', { ...company, agentId: agent.id });
  const { body: backup } = await call<Backup>('GET', '/api/backup');
  expect(backup).toMatchObject({ app: 'jobdash', schemaVersion: 3, companies: [a], agents: [agent] });

  // Change data after the backup
  await call('POST', '/api/companies', { ...company, companyName: 'B社' });
  await call('DELETE', `/api/companies/${a.id}`);
  await call('DELETE', `/api/agents/${agent.id}`);

  const restored = await call<{ restored: Record<string, number> }>('POST', '/api/backup/restore', backup);
  expect(restored.status).toBe(200);
  expect(restored.body.restored).toEqual({ companies: 1, agents: 1, todos: 0, resume: 0 });
  expect((await call<Company[]>('GET', '/api/companies')).body).toEqual([a]);
  expect((await call<Agent[]>('GET', '/api/agents')).body).toEqual([agent]);
});

test('restore rejects an invalid backup and keeps existing data', async () => {
  await call('POST', '/api/companies', company);
  const res = await call('POST', '/api/backup/restore', {
    app: 'jobdash',
    schemaVersion: 1,
    exportedAt: '',
    companies: [],
  });
  expect(res.status).toBe(400);

  const { body: backup } = await call<Backup>('GET', '/api/backup');
  const dangling = { ...backup, companies: backup.companies.map((c) => ({ ...c, agentId: 'missing' })) };
  expect((await call('POST', '/api/backup/restore', dangling)).status).toBe(400);
  expect((await call<Company[]>('GET', '/api/companies')).body).toHaveLength(1);
});

test('the bundled sample can be restored', async () => {
  const { sampleBackup } = await import('@jobdash/shared/sample');
  const res = await call<{ restored: Record<string, number> }>('POST', '/api/backup/restore', sampleBackup());
  expect(res.status).toBe(200);
  expect(res.body.restored).toEqual({ companies: 30, agents: 3, todos: 14, resume: 1 });
  expect((await call<{ fullName: string }>('GET', '/api/resume')).body.fullName).toBe('序部 大介');
  expect((await call<Company[]>('GET', '/api/companies')).body).toHaveLength(30);
});
