import { beforeEach, describe, expect, test } from 'vitest';
import type { Company } from '@jobdash/shared';
import { call, clearTable } from './helpers';
import type { Agent } from '@jobdash/shared';

const BASE = '/api/companies';

const valid = {
  companyName: 'テスト株式会社',
  companyUrl: 'https://example.com',
  agentJobUrl: '',
  phase: '書類選考',
  action: '選考結果待ち',
  nextActionAt: '2026-11-10T15:00',
  details: 'メモ\n2行目',
};

beforeEach(clearTable);

describe('companies API', () => {
  test('create, get and list', async () => {
    const created = await call<Company>('POST', BASE, valid);
    expect(created.status).toBe(201);
    expect(created.body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.body).toMatchObject({ version: 1, nextActionAt: '2026-11-10T15:00', details: 'メモ\n2行目' });
    expect(created.body.createdAt).toBe(created.body.updatedAt);
    expect('agentJobUrl' in created.body).toBe(false);

    const got = await call<Company>('GET', `${BASE}/${created.body.id}`);
    expect(got.status).toBe(200);
    expect(got.body).toEqual(created.body);

    const list = await call<Company[]>('GET', BASE);
    expect(list.body).toEqual([created.body]);
    expect(Object.keys(list.body[0])).not.toContain('PK');
    expect(Object.keys(list.body[0])).not.toContain('type');
  });

  test('create rejects invalid input with field errors', async () => {
    const res = await call<{ errors: string[] }>('POST', BASE, { ...valid, companyName: '', action: '辞退/不通過' });
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e) => e.startsWith('companyName'))).toBe(true);
    expect(res.body.errors.some((e) => e.startsWith('action'))).toBe(true);

    expect((await call('POST', BASE, '{broken')).status).toBe(400);
  });

  test('patch updates only given fields, bumps version and clears with ""/null', async () => {
    const { body: c } = await call<Company>('POST', BASE, valid);

    const res = await call<Company>('PATCH', `${BASE}/${c.id}`, { version: 1, phase: '一次面接', nextActionAt: '' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ phase: '一次面接', action: '選考結果待ち', companyName: valid.companyName, version: 2 });
    expect('nextActionAt' in res.body).toBe(false);
    expect(res.body.updatedAt >= c.updatedAt).toBe(true);
    expect(res.body.createdAt).toBe(c.createdAt);

    const cleared = await call<Company>('PATCH', `${BASE}/${c.id}`, { version: 2, companyUrl: null });
    expect('companyUrl' in cleared.body).toBe(false);

    const persisted = await call<Company>('GET', `${BASE}/${c.id}`);
    expect(persisted.body).toEqual(cleared.body);
  });

  test('patch with a stale version returns 409', async () => {
    const { body: c } = await call<Company>('POST', BASE, valid);
    await call('PATCH', `${BASE}/${c.id}`, { version: 1, phase: '一次面接' });
    const stale = await call('PATCH', `${BASE}/${c.id}`, { version: 1, phase: '二次面接' });
    expect(stale.status).toBe(409);
  });

  test('patch requires version and rejects invalid values', async () => {
    const { body: c } = await call<Company>('POST', BASE, valid);
    expect((await call('PATCH', `${BASE}/${c.id}`, { phase: '一次面接' })).status).toBe(400);
    expect((await call('PATCH', `${BASE}/${c.id}`, { version: 1, nextActionAt: '2026-11-10T25:00' })).status).toBe(400);
  });

  test('missing ids return 404', async () => {
    expect((await call('GET', `${BASE}/nope`)).status).toBe(404);
    expect((await call('PATCH', `${BASE}/nope`, { version: 1, phase: '一次面接' })).status).toBe(404);
    expect((await call('DELETE', `${BASE}/nope`)).status).toBe(404);
  });

  test('delete', async () => {
    const { body: c } = await call<Company>('POST', BASE, valid);
    expect((await call('DELETE', `${BASE}/${c.id}`)).status).toBe(204);
    expect((await call('GET', `${BASE}/${c.id}`)).status).toBe(404);
  });

  test('bulk import spanning multiple BatchWrite chunks', async () => {
    const records = Array.from({ length: 60 }, (_, i) => ({ ...valid, companyName: `インポート${i}` }));
    const res = await call<{ imported: number; agentsCreated: number }>('POST', `${BASE}/import`, { records });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ imported: 60, agentsCreated: 0 });
    expect((await call<Company[]>('GET', BASE)).body).toHaveLength(60);
  });

  test('bulk import is all-or-nothing', async () => {
    const res = await call<{ errors: string[] }>('POST', `${BASE}/import`, { records: [valid, { ...valid, phase: 'x' }] });
    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toMatch(/^records\.1\.phase/);
    expect((await call<Company[]>('GET', BASE)).body).toHaveLength(0);
    expect((await call('POST', `${BASE}/import`, { records: [] })).status).toBe(400);
  });

  test('agentId must reference an existing agent; it can be set and cleared', async () => {
    expect((await call('POST', BASE, { ...valid, agentId: 'nope' })).status).toBe(400);

    const { body: agent } = await call<Agent>('POST', '/api/agents', { name: '○○エージェント', shortName: 'MA' });
    const { body: c } = await call<Company>('POST', BASE, { ...valid, agentId: agent.id });
    expect(c.agentId).toBe(agent.id);

    expect((await call('PATCH', `${BASE}/${c.id}`, { version: 1, agentId: 'nope' })).status).toBe(400);
    const cleared = await call<Company>('PATCH', `${BASE}/${c.id}`, { version: 1, agentId: '' });
    expect('agentId' in cleared.body).toBe(false);
  });

  test('import links agents by short name and creates missing ones', async () => {
    const { body: ma } = await call<Agent>('POST', '/api/agents', { name: '○○エージェント', shortName: 'MA' });
    const res = await call<{ imported: number; agentsCreated: number }>('POST', `${BASE}/import`, {
      records: [
        { ...valid, companyName: 'A', agentShortName: 'ma' }, // case-insensitive match
        { ...valid, companyName: 'B', agentShortName: 'SA' },
        { ...valid, companyName: 'C', agentShortName: 'ＳＡ' }, // full-width matches the new SA agent
        { ...valid, companyName: 'D' },
      ],
    });
    expect(res.body).toEqual({ imported: 4, agentsCreated: 1 });

    const agents = (await call<Agent[]>('GET', '/api/agents')).body;
    const sa = agents.find((a) => a.shortName === 'SA');
    expect(sa).toMatchObject({ name: 'SA', shortName: 'SA' });
    const byName = Object.fromEntries((await call<Company[]>('GET', BASE)).body.map((c) => [c.companyName, c.agentId]));
    expect(byName).toEqual({ A: ma.id, B: sa!.id, C: sa!.id, D: undefined });
  });

  test('CORS allows the frontend origin', async () => {
    const { app } = await import('./helpers');
    const res = await app.request(BASE, { headers: { Origin: 'http://localhost:3000' } });
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
  });
});
