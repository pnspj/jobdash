import { describe, expect, test } from 'vitest';
import sampleJson from '../samples/sample-data.json';
import { backupSchema } from './backup';
import { SAMPLE_BASE_DATE, sampleBackup, shiftBackupDates, weekShiftDays } from './sample';
import { fromLocalDateTime } from './schedule';

const FICTIONAL_NAMES = [
  '株式会社うどんシステムズ',
  '焼きそばテクノロジー株式会社',
  'オムライスソリューションズ株式会社',
  'チャーハンネットワークス株式会社',
  'カレーライスシステム株式会社',
  'ナポリタンテクノロジー株式会社',
  'おにぎりソリューションズ株式会社',
  'ピザインフォメーション株式会社',
  'ラーメンプラットフォーム株式会社',
  'ハンバーガーシステム株式会社',
  '唐揚げテクノロジー株式会社',
  '肉じゃがシステムズ株式会社',
  '餃子ソリューションズ株式会社',
  '冷奴ネットワークス株式会社',
  'お味噌汁システム株式会社',
  'コロッケテクノロジー株式会社',
  '茶碗蒸しソリューションズ株式会社',
  'エビフライシステム株式会社',
  '焼き鳥インフォメーション株式会社',
  '麻婆豆腐テクノロジー株式会社',
  'プリンテクノロジー株式会社',
  'パンケーキシステム株式会社',
  'マカロンソリューションズ株式会社',
  'たい焼きネットワークス株式会社',
  'シュークリームシステム株式会社',
  'マヨネーズテクノロジー株式会社',
  'わさびソリューションズ株式会社',
  'チョコレートシステム株式会社',
  'かき氷インフォメーション株式会社',
  'ケチャップテクノロジー株式会社',
];

const sample = backupSchema.parse(sampleJson);
const count = (pred: (c: (typeof sample.companies)[number]) => boolean) => sample.companies.filter(pred).length;

describe('sample data', () => {
  test('is a valid backup of the current schema', () => {
    expect(sample.app).toBe('jobdash');
    expect(sample.agents).toHaveLength(3);
    expect(sample.companies).toHaveLength(30);
  });

  test('uses only the fictional names, dummy agents and example.com URLs', () => {
    const names = sample.companies.map((c) => c.companyName);
    expect(new Set(names).size).toBe(30);
    expect([...names].sort()).toEqual([...FICTIONAL_NAMES].sort());
    expect(sample.agents.map((a) => `${a.name}/${a.shortName}`).sort()).toEqual(
      ['○○エージェント/MA', '△△エージェント/SA', '××エージェント/BA'].sort(),
    );
    const urls = JSON.stringify(sample).match(/https?:\/\/[^"\s]+/g) ?? [];
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(new URL(url).hostname.endsWith('example.com')).toBe(true);
  });

  test('distribution matches the requirements', () => {
    expect(count((c) => c.phase === '書類選考' && c.action === '不通過')).toBe(15);
    expect(count((c) => c.phase === '一次面接' && c.action === '辞退')).toBe(2);
    expect(count((c) => c.phase === 'オファー/内定')).toBe(2);
  });

  test('companies waiting for the other party or closed have no next action', () => {
    const waiting = sample.companies.filter((c) =>
      ['日程調整待ち', '選考結果待ち', '辞退', '不通過'].includes(c.action),
    );
    expect(waiting.length).toBeGreaterThan(0);
    for (const c of waiting) expect(c.nextActionAt, c.companyName).toBeUndefined();
  });

  test('every agentId references an agent', () => {
    const ids = new Set(sample.agents.map((a) => a.id));
    for (const c of sample.companies) if (c.agentId) expect(ids.has(c.agentId)).toBe(true);
    for (const t of sample.todos ?? []) if (t.agentId) expect(ids.has(t.agentId)).toBe(true);
  });

  test('to-dos: agent and dashboard ones, open and done (done ones have completedAt)', () => {
    const todos = sample.todos ?? [];
    expect(todos.some((t) => t.agentId && t.status === 'open')).toBe(true);
    expect(todos.some((t) => !t.agentId && t.status === 'open')).toBe(true);
    expect(todos.some((t) => !t.agentId && t.status === 'open' && !t.nextActionAt)).toBe(true); // undated
    for (const t of todos) expect(Boolean(t.completedAt)).toBe(t.status === 'done');
  });
});

describe('date shifting', () => {
  test('weekShiftDays moves the base Monday to the first Monday on or after today', () => {
    expect(weekShiftDays(SAMPLE_BASE_DATE)).toBe(0); // Monday itself
    expect(weekShiftDays('2026-11-08')).toBe(0); // Sunday before the base week
    expect(weekShiftDays('2026-11-10')).toBe(7); // Tuesday -> next Monday
    expect(weekShiftDays('2026-11-15')).toBe(7);
    expect(weekShiftDays('2026-11-16')).toBe(7);
    expect(weekShiftDays('2027-01-06')).toBe(63);
    expect(weekShiftDays('2026-11-02')).toBe(-7);
  });

  test.each(['2026-11-08', '2026-11-09', '2026-11-11', '2026-11-14', '2027-02-26', '2027-03-01'])(
    'loaded on %s, every next action is in the future and weekdays are business days',
    (today) => {
      const b = sampleBackup(today);
      const nextActions = [...b.companies, ...(b.todos ?? []).filter((t) => t.status === 'open')].flatMap((x) =>
        x.nextActionAt ? [x.nextActionAt] : [],
      );
      expect(nextActions.length).toBeGreaterThan(0);
      for (const at of nextActions) expect(at.slice(0, 10) > today).toBe(true);
      for (const iv of b.companies.flatMap((c) => c.interviews ?? [])) {
        expect([1, 2, 3, 4, 5]).toContain(fromLocalDateTime(iv.start).getDay());
      }
    },
  );

  test('shifted sample stays valid and keeps weekdays and times', () => {
    const shifted = shiftBackupDates(sample, 56);
    expect(backupSchema.safeParse(shifted).success).toBe(true);
    const before = sample.companies.flatMap((c) => c.interviews ?? []);
    const after = shifted.companies.flatMap((c) => c.interviews ?? []);
    expect(after).toHaveLength(before.length);
    after.forEach((iv, i) => {
      expect(fromLocalDateTime(iv.start).getDay()).toBe(fromLocalDateTime(before[i].start).getDay());
      expect(iv.start.slice(11)).toBe(before[i].start.slice(11));
    });
    const dateOnly = shifted.companies.find((c) => c.nextActionAt?.length === 10);
    expect(dateOnly?.nextActionAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('sampleBackup loaded just before the base week returns the original dates', () => {
    const b = sampleBackup('2026-11-08');
    expect(b.companies).toEqual(sample.companies);
  });
});
