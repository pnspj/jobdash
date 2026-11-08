import { describe, expect, test } from 'vitest';
import {
  formatSlot,
  formatSlots,
  fromLocalDateTime,
  normalizeSlots,
  SLOT_FORMAT_PRESETS,
  setInterviewSchema,
  setPreferredSlotsSchema,
  toLocalDateTime,
} from './schedule';

const slot = { start: '2026-11-04T17:00', end: '2026-11-04T20:00' }; // Wednesday

describe('formatSlot', () => {
  test('default format', () => {
    expect(formatSlot(slot)).toBe('11/4（水）17:00開始～20:00終了');
  });

  test.each(SLOT_FORMAT_PRESETS.map((p) => [p.label, p.template]))(
    'preset %s renders its own label',
    (label, template) => {
      expect(formatSlot(slot, template)).toBe(label);
    },
  );

  test('custom template and multi-day slot', () => {
    expect(formatSlot(slot, '{月}月{日}日 {開始}-{終了}')).toBe('11月4日 17:00-20:00');
    expect(formatSlot({ start: '2026-11-04T23:00', end: '2026-11-05T01:00' })).toBe(
      '11/4（水）23:00開始～11/5（木）01:00終了',
    );
  });

  test('formatSlots sorts and applies a bullet', () => {
    const text = formatSlots([{ start: '2026-11-05T10:00', end: '2026-11-05T12:00' }, slot], undefined, '・');
    expect(text).toBe('・11/4（水）17:00開始～20:00終了\n・11/5（木）10:00開始～12:00終了');
  });
});

test('local date-time round trip', () => {
  expect(toLocalDateTime(fromLocalDateTime('2026-11-04T09:05'))).toBe('2026-11-04T09:05');
  expect(fromLocalDateTime('2026-11-04').getHours()).toBe(0);
});

test('normalizeSlots sorts and removes duplicates', () => {
  const later = { start: '2026-11-05T10:00', end: '2026-11-05T11:00' };
  expect(normalizeSlots([later, slot, { ...slot }])).toEqual([slot, later]);
});

describe('schemas', () => {
  test('setInterviewSchema requires version and end after start', () => {
    expect(setInterviewSchema.safeParse({ version: 1, ...slot }).success).toBe(true);
    expect(setInterviewSchema.safeParse(slot).success).toBe(false);
    expect(setInterviewSchema.safeParse({ version: 1, start: slot.end, end: slot.start }).success).toBe(false);
    expect(setInterviewSchema.safeParse({ version: 1, start: '2026-11-04', end: '2026-11-04T10:00' }).success).toBe(
      false,
    );
  });

  test('setPreferredSlotsSchema accepts an empty list (clear)', () => {
    expect(setPreferredSlotsSchema.parse({ version: 1, slots: [] }).slots).toEqual([]);
  });
});
