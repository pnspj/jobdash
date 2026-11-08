import { expect, test } from 'vitest';
import type { ActionStatus, SelectionPhase } from './enums';
import { groupByAgent, maxPhaseTotal, phaseCounts, selectionSummary } from './stats';

const c = (phase: SelectionPhase, action: ActionStatus, agentId?: string) => ({ phase, action, agentId });

const companies = [
  c('書類選考', '選考結果待ち', 'ma'),
  c('一次面接', '要本番準備', 'ma'),
  c('一次面接', '不通過', 'ma'),
  c('一次面接', '不通過', 'sa'),
  c('二次面接', '辞退', 'sa'),
  c('オファー/内定', '要対応'),
];

test('phaseCounts: active per phase; rejected only when requested; declined never', () => {
  const off = phaseCounts(companies);
  expect(off.map((p) => p.phase)).toEqual([
    '書類選考',
    '試験/課題',
    '一次面接',
    '二次面接',
    '最終面接',
    'オファー/内定',
  ]);
  expect(off.map((p) => [p.active, p.rejected])).toEqual([
    [1, 0],
    [0, 0],
    [1, 0],
    [0, 0],
    [0, 0],
    [1, 0],
  ]);

  const on = phaseCounts(companies, { includeRejected: true });
  expect(on.find((p) => p.phase === '一次面接')).toEqual({ phase: '一次面接', active: 1, rejected: 2 });
  expect(on.find((p) => p.phase === '二次面接')).toEqual({ phase: '二次面接', active: 0, rejected: 0 });
});

test('selectionSummary', () => {
  expect(selectionSummary(companies)).toEqual({
    total: 6,
    active: 3,
    offers: 1,
    interviewing: 1,
    rejected: 2,
    declined: 1,
  });
});

test('groupByAgent and maxPhaseTotal', () => {
  const groups = groupByAgent(companies);
  expect([...groups.keys()]).toEqual(['ma', 'sa', '']);
  expect(groups.get('ma')).toHaveLength(3);
  const counts = [...groups.values()].map((g) => phaseCounts(g, { includeRejected: true }));
  expect(maxPhaseTotal(counts)).toBe(2);
  expect(maxPhaseTotal([])).toBe(0);
});
