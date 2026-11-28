import type { Agent, Company } from '@jobdash/shared';
import { beforeEach, expect, test } from 'vitest';
import { call, clearData } from './helpers';

beforeEach(clearData);

test('delete all data requires explicit confirmation', async () => {
  const { body: agent } = await call<Agent>('POST', '/api/agents', { name: '○○エージェント', shortName: 'MA' });
  await call('POST', '/api/companies', {
    companyName: 'A社',
    agentId: agent.id,
    phase: '書類選考',
    action: '選考結果待ち',
  });
  await call('POST', '/api/companies', { companyName: 'B社', phase: '書類選考', action: '選考結果待ち' });

  expect((await call('DELETE', '/api/data')).status).toBe(400);
  expect((await call('DELETE', '/api/data?confirm=yes')).status).toBe(400);
  expect((await call<Company[]>('GET', '/api/companies')).body).toHaveLength(2);

  const res = await call<{ deleted: Record<string, number> }>('DELETE', '/api/data?confirm=DELETE_ALL');
  expect(res.status).toBe(200);
  expect(res.body.deleted).toEqual({ companies: 2, agents: 1, todos: 0, resume: 0, total: 3 });
  expect((await call<Company[]>('GET', '/api/companies')).body).toEqual([]);
  expect((await call<Agent[]>('GET', '/api/agents')).body).toEqual([]);
});
