import { expect, test } from 'vitest';
import { returnLabel, sanitizeReturnTo, withReturnTo } from './returnTo';

test('sanitizeReturnTo accepts only same-origin paths', () => {
  expect(sanitizeReturnTo('/calendar?view=dayGridMonth&date=2026-11-01')).toBe('/calendar?view=dayGridMonth&date=2026-11-01');
  expect(sanitizeReturnTo('/agents/abc')).toBe('/agents/abc');
  expect(sanitizeReturnTo(null)).toBeUndefined();
  expect(sanitizeReturnTo('')).toBeUndefined();
  expect(sanitizeReturnTo('https://evil.example')).toBeUndefined();
  expect(sanitizeReturnTo('//evil.example')).toBeUndefined();
  expect(sanitizeReturnTo('/\\evil.example')).toBeUndefined();
});

test('withReturnTo encodes the target and keeps existing query', () => {
  expect(withReturnTo('/companies/1', '/calendar?date=2026-11-01')).toBe('/companies/1?from=%2Fcalendar%3Fdate%3D2026-11-01');
  expect(withReturnTo('/companies/1/schedule?mode=first', '/calendar')).toBe('/companies/1/schedule?mode=first&from=%2Fcalendar');
  expect(withReturnTo('/companies/1', undefined)).toBe('/companies/1');
});

test('returnLabel', () => {
  expect(returnLabel('/calendar?view=timeGridWeek')).toBe('カレンダー');
  expect(returnLabel('/agents/1')).toBe('エージェント');
  expect(returnLabel(undefined)).toBe('企業一覧');
});
