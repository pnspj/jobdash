import { expect, test } from 'vitest';
import type { Company } from './company';
import { dashboardRows, isEmptyWorkspace } from './dashboard';
import type { Todo } from './todo';

const company = (id: string, patch: Partial<Company>): Company => ({
  id,
  companyName: id,
  phase: '一次面接',
  action: '要本番準備',
  details: '',
  version: 1,
  createdAt: '',
  updatedAt: '',
  ...patch,
});
const todo = (id: string, patch: Partial<Todo>): Todo => ({
  id,
  title: id,
  details: '',
  status: 'open',
  version: 1,
  createdAt: '',
  updatedAt: '',
  ...patch,
});

test('merges sources with the right filters, ordered by next action (undated last)', () => {
  const rows = dashboardRows(
    [
      company('A社', { nextActionAt: '2026-11-11T10:00', agentId: 'ma' }),
      company('B社 日時なし', {}),
      company('C社 不通過', { nextActionAt: '2026-11-10', action: '不通過' }),
      company('D社 辞退', { nextActionAt: '2026-11-10', action: '辞退' }),
      company('E社 日付のみ', { nextActionAt: '2026-11-11' }),
    ],
    [
      todo('面接対策', { agentId: 'ma', nextActionAt: '2026-11-11T09:00' }),
      todo('完了済み', { status: 'done', nextActionAt: '2026-11-09' }),
      todo('現職に連絡する', { nextActionAt: '2026-11-10T12:00' }),
      todo('README を整える', {}),
      todo('進捗連絡', { agentId: 'sa' }),
    ],
  );
  expect(rows.map((r) => `${r.kind}:${r.title}`)).toEqual([
    'todo:現職に連絡する',
    'agentTodo:面接対策',
    'company:A社',
    'company:E社 日付のみ',
    'agentTodo:進捗連絡',
    'todo:README を整える',
  ]);
  const a = rows.find((r) => r.title === 'A社');
  expect(a).toMatchObject({ kind: 'company', agentId: 'ma', phase: '一次面接', action: '要本番準備' });
});

test('same date-time: companies, then agent to-dos, then dashboard to-dos', () => {
  const at = '2026-11-10T10:00';
  const rows = dashboardRows(
    [company('Z社', { nextActionAt: at })],
    [todo('b', { nextActionAt: at }), todo('a', { nextActionAt: at, agentId: 'ma' })],
  );
  expect(rows.map((r) => r.kind)).toEqual(['company', 'agentTodo', 'todo']);
});

test('isEmptyWorkspace', () => {
  expect(isEmptyWorkspace({ companies: 0, agents: 0, todos: 0 })).toBe(true);
  expect(isEmptyWorkspace({ companies: 0, agents: 0, todos: 1 })).toBe(false);
  expect(isEmptyWorkspace({ companies: 1, agents: 0, todos: 0 })).toBe(false);
});
