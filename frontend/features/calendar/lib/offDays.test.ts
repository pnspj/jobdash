import { expect, test } from 'vitest';
import { isOffDay, offDayClassNames } from './offDays';

test('weekends and Japanese public holidays are off days', () => {
  expect(isOffDay(new Date(2026, 10, 7))).toBe(true); // Sat
  expect(isOffDay(new Date(2026, 10, 8))).toBe(true); // Sun
  expect(isOffDay(new Date(2026, 10, 3))).toBe(true); // Tue, 文化の日
  expect(isOffDay(new Date(2026, 10, 23))).toBe(true); // Mon, 勤労感謝の日
  expect(isOffDay(new Date(2026, 10, 4))).toBe(false); // Wed
  expect(offDayClassNames({ date: new Date(2026, 10, 3) })).toEqual(['jd-offday']);
  expect(offDayClassNames({ date: new Date(2026, 10, 5) })).toEqual([]);
});
