import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareCompanies, formatNextAction } from './sort';
import type { CompanyRecord } from './types';

const base: CompanyRecord = {
  id: '',
  companyName: 'A社',
  agent: 'RA',
  phase: '一次面接',
  action: '要対応',
  nextActionDate: '',
  details: '',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const make = (id: string, patch: Partial<CompanyRecord>): CompanyRecord => ({ ...base, id, ...patch });
const order = (list: CompanyRecord[]) => [...list].sort(compareCompanies).map((c) => c.id);

test('next action date-time ascending, untimed after timed, empty last', () => {
  assert.deepEqual(
    order([
      make('none', {}),
      make('d2', { nextActionDate: '2026-11-10' }),
      make('d1-untimed', { nextActionDate: '2026-11-09' }),
      make('d1-15', { nextActionDate: '2026-11-09', nextActionTime: '15:00' }),
      make('d1-09', { nextActionDate: '2026-11-09', nextActionTime: '09:00' }),
    ]),
    ['d1-09', 'd1-15', 'd1-untimed', 'd2', 'none'],
  );
});

test('ties broken by action asc, phase desc, agent asc, company asc', () => {
  const d = { nextActionDate: '2026-11-09', nextActionTime: '10:00' };
  assert.deepEqual(
    order([
      make('wait', { ...d, action: '選考結果待ち' }),
      make('schedule', { ...d, action: '要日程調整' }),
      make('final', { ...d, phase: '最終面接' }),
      make('agentWP', { ...d, agent: 'WP' }),
      make('agentDD', { ...d, agent: 'dd', companyName: 'Z社' }),
      make('companyB', { ...d, companyName: 'B社' }),
      make('companyA', { ...d }),
    ]),
    // 要日程調整 < 要対応 < 選考結果待ち; within 要対応: 最終面接 first,
    // then 一次面接 ordered by agent (dd < RA < WP), then by company name
    ['schedule', 'final', 'agentDD', 'companyA', 'companyB', 'agentWP', 'wait'],
  );
});

test('rows without a date are still ordered by the remaining keys', () => {
  assert.deepEqual(
    order([make('b', { action: '選考結果待ち' }), make('a', { action: '要対応' })]),
    ['a', 'b'],
  );
});

test('formatNextAction', () => {
  assert.equal(formatNextAction({ nextActionDate: '2026-11-09', nextActionTime: '15:00' }), '2026-11-09 15:00');
  assert.equal(formatNextAction({ nextActionDate: '2026-11-09' }), '2026-11-09');
  assert.equal(formatNextAction({ nextActionDate: '', nextActionTime: '15:00' }), '');
});
