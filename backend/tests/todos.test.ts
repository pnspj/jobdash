import type { Agent, Backup, Todo } from '@jobdash/shared';
import { beforeEach, describe, expect, test } from 'vitest';
import { call, clearData } from './helpers';

const BASE = '/api/todos';

beforeEach(clearData);

async function agent() {
  return (await call<Agent>('POST', '/api/agents', { name: '○○エージェント', shortName: 'MA' })).body;
}

describe('todos API', () => {
  test('create, list by scope/agent, get', async () => {
    const a = await agent();
    const dash = await call<Todo>('POST', BASE, { title: '職務経歴書に現在の業務を書く', nextActionAt: '2026-11-10' });
    expect(dash.status).toBe(201);
    expect(dash.body).toMatchObject({ status: 'open', details: '', version: 1 });
    expect('agentId' in dash.body).toBe(false);
    const ag = await call<Todo>('POST', BASE, { title: '面談', agentId: a.id, details: 'オンライン' });

    expect((await call<Todo[]>('GET', BASE)).body).toHaveLength(2);
    expect((await call<Todo[]>('GET', `${BASE}?scope=dashboard`)).body.map((t) => t.id)).toEqual([dash.body.id]);
    expect((await call<Todo[]>('GET', `${BASE}?scope=agent`)).body.map((t) => t.id)).toEqual([ag.body.id]);
    expect((await call<Todo[]>('GET', `${BASE}?agentId=${a.id}`)).body.map((t) => t.id)).toEqual([ag.body.id]);
    expect((await call<Todo>('GET', `${BASE}/${ag.body.id}`)).body).toEqual(ag.body);
  });

  test('completing sets completedAt; reopening removes it', async () => {
    const { body: t } = await call<Todo>('POST', BASE, { title: '現職に連絡する' });
    const done = await call<Todo>('PATCH', `${BASE}/${t.id}`, { version: 1, status: 'done' });
    expect(done.body.status).toBe('done');
    expect(Date.parse(done.body.completedAt ?? '')).not.toBeNaN();

    const reopened = await call<Todo>('PATCH', `${BASE}/${t.id}`, { version: 2, status: 'open' });
    expect(reopened.body.status).toBe('open');
    expect('completedAt' in reopened.body).toBe(false);
  });

  test('created as done gets completedAt', async () => {
    const { body } = await call<Todo>('POST', BASE, { title: '済み', status: 'done' });
    expect(body.completedAt).toBe(body.createdAt);
  });

  test('edit fields, clear date, stale version, delete', async () => {
    const { body: t } = await call<Todo>('POST', BASE, { title: 'a', nextActionAt: '2026-11-10T10:00' });
    const edited = await call<Todo>('PATCH', `${BASE}/${t.id}`, {
      version: 1,
      title: 'b',
      details: 'メモ',
      nextActionAt: '',
    });
    expect(edited.body).toMatchObject({ title: 'b', details: 'メモ', version: 2 });
    expect('nextActionAt' in edited.body).toBe(false);
    expect((await call('PATCH', `${BASE}/${t.id}`, { version: 1, title: 'c' })).status).toBe(409);
    expect((await call('DELETE', `${BASE}/${t.id}`)).status).toBe(204);
    expect((await call('GET', `${BASE}/${t.id}`)).status).toBe(404);
  });

  test('validation and unknown agent', async () => {
    expect((await call('POST', BASE, { title: '' })).status).toBe(400);
    expect((await call('POST', BASE, { title: 'a', status: 'doing' })).status).toBe(400);
    expect((await call('POST', BASE, { title: 'a', agentId: 'nope' })).status).toBe(400);
    expect((await call('GET', `${BASE}?scope=nope`)).status).toBe(400);
  });
});

test("deleting an agent deletes its to-dos but keeps others'", async () => {
  const a = await agent();
  await call('POST', BASE, { title: '面談', agentId: a.id });
  await call('POST', BASE, { title: '書類提出', agentId: a.id });
  await call('POST', BASE, { title: 'ダッシュボード' });
  expect((await call('DELETE', `/api/agents/${a.id}`)).status).toBe(204);
  expect((await call<Todo[]>('GET', BASE)).body.map((t) => t.title)).toEqual(['ダッシュボード']);
});

test('to-dos are included in backup/restore and delete-all', async () => {
  const a = await agent();
  await call('POST', BASE, { title: '面談', agentId: a.id });
  await call('POST', BASE, { title: '現職に連絡する' });
  const { body: backup } = await call<Backup>('GET', '/api/backup');
  expect(backup.todos).toHaveLength(2);

  const deleted = await call<{ deleted: Record<string, number> }>('DELETE', '/api/data?confirm=DELETE_ALL');
  expect(deleted.body.deleted).toMatchObject({ todos: 2, agents: 1 });

  const restored = await call<{ restored: Record<string, number> }>('POST', '/api/backup/restore', backup);
  expect(restored.body.restored).toMatchObject({ todos: 2, agents: 1 });

  const dangling = { ...backup, agents: [], todos: backup.todos };
  expect((await call('POST', '/api/backup/restore', dangling)).status).toBe(400);
});
