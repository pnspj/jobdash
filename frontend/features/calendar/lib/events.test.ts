import { expect, test } from 'vitest';
import type { Company } from '@jobdash/shared';
import { companyEvents } from './events';

const base = { phase: '一次面接', details: '', version: 1, createdAt: '', updatedAt: '' } as const;
const slot = { start: '2026-11-04T17:00', end: '2026-11-04T18:00' };

const companies: Company[] = [
  { ...base, id: 'a', companyName: 'A社', action: '要本番準備', interviews: [{ stage: '一次面接', ...slot }], preferredSlots: [slot] },
  { ...base, id: 'b', companyName: 'B社', action: '不通過', interviews: [{ stage: '二次面接', ...slot }] },
];

test('interviews and preferred slots of open companies', () => {
  const events = companyEvents(companies, { showPreferred: true, showClosed: false });
  expect(events.map((e) => e.title)).toEqual(['A社 一次面接', 'A社 希望']);
  expect(events[0].extendedProps).toEqual({ kind: 'interview', companyId: 'a', stage: '一次面接' });
});

test('filters: hide preferred, include closed companies', () => {
  const events = companyEvents(companies, { showPreferred: false, showClosed: true });
  expect(events.map((e) => e.title)).toEqual(['A社 一次面接', 'B社 二次面接']);
});
