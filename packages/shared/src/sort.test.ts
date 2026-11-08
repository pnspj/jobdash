import { expect, test } from 'vitest';
import type { Company } from './company';
import { companyComparator } from './sort';

// In tests agentId doubles as the display name
const compareCompanies = companyComparator((id) => id ?? '');

type Sortable = Pick<Company, 'nextActionAt' | 'action' | 'phase' | 'agentId' | 'companyName'> & { id: string };

const base: Omit<Sortable, 'id'> = { companyName: 'A社', agentId: 'MA', phase: '一次面接', action: '要対応' };
const make = (id: string, patch: Partial<Sortable> = {}): Sortable => ({ ...base, id, ...patch });
const order = (list: Sortable[]) => [...list].sort(compareCompanies).map((c) => c.id);

test('next action date-time ascending, date-only after timed on the same day, empty last', () => {
  expect(
    order([
      make('none'),
      make('d2', { nextActionAt: '2026-11-10' }),
      make('d1-untimed', { nextActionAt: '2026-11-09' }),
      make('d1-15', { nextActionAt: '2026-11-09T15:00' }),
      make('d1-09', { nextActionAt: '2026-11-09T09:00' }),
    ]),
  ).toEqual(['d1-09', 'd1-15', 'd1-untimed', 'd2', 'none']);
});

test('ties broken by action asc, phase desc, agent asc, company asc', () => {
  const at = { nextActionAt: '2026-11-09T10:00' };
  expect(
    order([
      make('wait', { ...at, action: '選考結果待ち' }),
      make('schedule', { ...at, action: '要日程調整' }),
      make('final', { ...at, phase: '最終面接' }),
      make('agentSA', { ...at, agentId: 'SA' }),
      make('agentBA', { ...at, agentId: 'ba', companyName: 'Z社' }), // lower case: ordering is case-insensitive
      make('companyB', { ...at, companyName: 'B社' }),
      make('companyA', { ...at }),
    ]),
  ).toEqual(['schedule', 'final', 'agentBA', 'companyA', 'companyB', 'agentSA', 'wait']);
});

test('closed actions sort after open ones when dates tie', () => {
  expect(order([make('rejected', { action: '不通過' }), make('declined', { action: '辞退' }), make('open')])).toEqual([
    'open',
    'declined',
    'rejected',
  ]);
});
