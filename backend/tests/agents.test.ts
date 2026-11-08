import type { Agent, Company } from '@jobdash/shared';
import { beforeEach, describe, expect, test } from 'vitest';
import { call, clearTable } from './helpers';

const BASE = '/api/agents';

const valid = {
  name: '○○エージェント',
  shortName: 'MA',
  contactName: '山田 太郎',
  contactEmail: 'yamada@example.com',
  contactPhone: '03-0000-0000',
  url: 'https://agent-ma.example.com/',
  memo: '毎週月曜に連絡',
};

beforeEach(clearTable);

describe('agents API', () => {
  test('CRUD', async () => {
    const created = await call<Agent>('POST', BASE, valid);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ ...valid, version: 1 });

    expect((await call<Agent[]>('GET', BASE)).body).toEqual([created.body]);
    expect((await call<Agent>('GET', `${BASE}/${created.body.id}`)).body).toEqual(created.body);

    const updated = await call<Agent>('PATCH', `${BASE}/${created.body.id}`, {
      version: 1,
      contactEmail: '',
      memo: '',
    });
    expect(updated.status).toBe(200);
    expect('contactEmail' in updated.body).toBe(false);
    expect(updated.body).toMatchObject({ memo: '', version: 2, shortName: 'MA' });

    expect((await call('DELETE', `${BASE}/${created.body.id}`)).status).toBe(204);
    expect((await call('GET', `${BASE}/${created.body.id}`)).status).toBe(404);
  });

  test('validation', async () => {
    const res = await call<{ errors: string[] }>('POST', BASE, { name: '', shortName: '', contactEmail: 'not-mail' });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.split(':')[0]).sort()).toEqual(['contactEmail', 'name', 'shortName']);
  });

  test('short name must be unique (case/width-insensitive)', async () => {
    const { body: a } = await call<Agent>('POST', BASE, valid);
    expect((await call('POST', BASE, { ...valid, name: '別', shortName: 'ｍａ' })).status).toBe(409);

    const { body: b } = await call<Agent>('POST', BASE, { name: '××エージェント', shortName: 'BA' });
    expect((await call('PATCH', `${BASE}/${b.id}`, { version: 1, shortName: 'MA' })).status).toBe(409);
    // Keeping its own short name is fine
    expect(
      (await call('PATCH', `${BASE}/${a.id}`, { version: 1, shortName: 'MA', name: '○○エージェント株式会社' })).status,
    ).toBe(200);
  });

  test('agent referenced by a company cannot be deleted', async () => {
    const { body: agent } = await call<Agent>('POST', BASE, valid);
    const { body: company } = await call<Company>('POST', '/api/companies', {
      companyName: 'A社',
      agentId: agent.id,
      phase: '書類選考',
      action: '選考結果待ち',
    });

    const res = await call<{ message: string }>('DELETE', `${BASE}/${agent.id}`);
    expect(res.status).toBe(409);
    expect(res.body.message).toContain('A社');

    await call('DELETE', `/api/companies/${company.id}`);
    expect((await call('DELETE', `${BASE}/${agent.id}`)).status).toBe(204);
  });
});
