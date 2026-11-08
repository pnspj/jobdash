/**
 * Fictional sample data (packages/shared/samples/sample-data.json) for demos and manual testing.
 * Imported via "@jobdash/shared/sample" so the JSON is bundled only where it is used.
 */
import sampleJson from '../samples/sample-data.json';
import { type Backup, backupSchema } from './backup';
import { todayLocalDate } from './datetime';
import { fromLocalDateTime, toLocalDateTime } from './schedule';

/** Monday of the week the sample's dates were written for. */
export const SAMPLE_BASE_DATE = '2026-11-09';

const DAY_MS = 86_400_000;

/** Shift a "YYYY-MM-DD[THH:mm]" value by whole days, keeping its form. */
function shiftLocal(value: string, days: number): string {
  const d = fromLocalDateTime(value);
  d.setDate(d.getDate() + days);
  const shifted = toLocalDateTime(d);
  return value.length === 10 ? shifted.slice(0, 10) : shifted;
}

const shiftIso = (value: string, days: number) => new Date(Date.parse(value) + days * DAY_MS).toISOString();

/** Shift every date in a backup by `days` (interviews, preferred slots, next actions and timestamps). */
export function shiftBackupDates(backup: Backup, days: number): Backup {
  if (days === 0) return backup;
  const slot = <T extends { start: string; end: string }>(s: T): T => ({
    ...s,
    start: shiftLocal(s.start, days),
    end: shiftLocal(s.end, days),
  });
  return {
    ...backup,
    companies: backup.companies.map((c) => ({
      ...c,
      ...(c.nextActionAt && { nextActionAt: shiftLocal(c.nextActionAt, days) }),
      ...(c.interviews && { interviews: c.interviews.map(slot) }),
      ...(c.preferredSlots && { preferredSlots: c.preferredSlots.map(slot) }),
      createdAt: shiftIso(c.createdAt, days),
      updatedAt: shiftIso(c.updatedAt, days),
    })),
    agents: backup.agents.map((a) => ({
      ...a,
      createdAt: shiftIso(a.createdAt, days),
      updatedAt: shiftIso(a.updatedAt, days),
    })),
    ...(backup.todos && {
      todos: backup.todos.map((t) => ({
        ...t,
        ...(t.nextActionAt && { nextActionAt: shiftLocal(t.nextActionAt, days) }),
        ...(t.completedAt && { completedAt: shiftIso(t.completedAt, days) }),
        createdAt: shiftIso(t.createdAt, days),
        updatedAt: shiftIso(t.updatedAt, days),
      })),
    }),
    // Resume periods are career history (year-month) and are not shifted
    ...(backup.resume && { resume: { ...backup.resume, updatedAt: shiftIso(backup.resume.updatedAt, days) } }),
  };
}

/**
 * Whole weeks (in days) from the sample's base Monday to the first Monday on or after `today`.
 * Upcoming items of the sample (Tuesday of the base week or later) therefore always land in the future,
 * whatever weekday the sample is loaded on.
 */
export function weekShiftDays(today: string, base = SAMPLE_BASE_DATE): number {
  const t = fromLocalDateTime(today);
  const monday = new Date(t);
  monday.setDate(t.getDate() + ((8 - t.getDay()) % 7)); // today if Monday, else the next Monday
  return Math.round((monday.getTime() - fromLocalDateTime(base).getTime()) / (7 * DAY_MS)) * 7;
}

/** The sample as a backup, with dates moved so that upcoming items are in the future (weekdays are preserved). */
export function sampleBackup(today: string = todayLocalDate()): Backup {
  const backup = backupSchema.parse(sampleJson);
  return { ...shiftBackupDates(backup, weekShiftDays(today)), exportedAt: new Date().toISOString() };
}
