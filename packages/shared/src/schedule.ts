import { z } from 'zod';

/** Interview stages that can be scheduled on the calendar. */
export const INTERVIEW_STAGES = ['一次面接', '二次面接', '最終面接'] as const;
export type InterviewStage = (typeof INTERVIEW_STAGES)[number];

export const MAX_PREFERRED_SLOTS = 50;

/** "YYYY-MM-DDTHH:mm" (time required). */
const DATETIME_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d$/;
const localDateTime = z.string().regex(DATETIME_RE, 'YYYY-MM-DDTHH:mm 形式で指定してください');

export const timeSlotSchema = z
  .object({ start: localDateTime, end: localDateTime })
  .refine((s) => s.end > s.start, { message: '終了は開始より後にしてください', path: ['end'] });

export const interviewSchema = z.object({
  stage: z.enum(INTERVIEW_STAGES),
  start: localDateTime,
  end: localDateTime,
});

export type TimeSlot = z.infer<typeof timeSlotSchema>;
export type Interview = z.infer<typeof interviewSchema>;

/** PUT /companies/:id/interviews/:stage */
export const setInterviewSchema = z.object({ version: z.number().int().nonnegative() }).and(timeSlotSchema);

/** PUT /companies/:id/preferred-slots */
export const setPreferredSlotsSchema = z.object({
  version: z.number().int().nonnegative(),
  slots: z.array(timeSlotSchema).max(MAX_PREFERRED_SLOTS, `希望日時は${MAX_PREFERRED_SLOTS}件までです`),
});

export const sortSlots = <T extends TimeSlot>(slots: T[]) =>
  [...slots].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));

/** Sort by start and drop exact duplicates. */
export const normalizeSlots = (slots: TimeSlot[]) =>
  sortSlots(slots).filter((s, i, arr) => i === 0 || s.start !== arr[i - 1].start || s.end !== arr[i - 1].end);

// ---------- local date-time <-> Date ----------

const pad = (n: number) => String(n).padStart(2, '0');

/** Date -> "YYYY-MM-DDTHH:mm" in local time. */
export const toLocalDateTime = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** "YYYY-MM-DD[THH:mm]" -> Date in local time. */
export function fromLocalDateTime(s: string): Date {
  const [date, time = '00:00'] = s.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return new Date(y, m - 1, d, h, mi);
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/** Parts of a local date-time used by text formats. */
export function dateTimeParts(s: string) {
  const d = fromLocalDateTime(s);
  return {
    year: String(d.getFullYear()),
    month: String(d.getMonth() + 1),
    day: String(d.getDate()),
    weekday: WEEKDAYS[d.getDay()],
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

// ---------- text formats for agent communication ----------

/**
 * Slot text template. Tokens:
 *   {年} {月} {日} {曜}  - date of the start
 *   {開始} {終了}        - HH:mm of start / end
 *   {終了日}             - "M/D（曜）" of the end, only when it is on a different day (else empty)
 */
export const SLOT_FORMAT_PRESETS = [
  { id: 'start-end-label', label: '11/4（水）17:00開始～20:00終了', template: '{月}/{日}（{曜}）{開始}開始～{終了日}{終了}終了' },
  { id: 'range', label: '11/4（水）17:00～20:00', template: '{月}/{日}（{曜}）{開始}～{終了日}{終了}' },
  { id: 'with-year', label: '2026/11/4（水）17:00～20:00', template: '{年}/{月}/{日}（{曜}）{開始}～{終了日}{終了}' },
  { id: 'kanji', label: '11月4日（水）17:00～20:00', template: '{月}月{日}日（{曜}）{開始}～{終了日}{終了}' },
] as const;

export const DEFAULT_SLOT_TEMPLATE = SLOT_FORMAT_PRESETS[0].template;

export function formatSlot(slot: TimeSlot, template: string = DEFAULT_SLOT_TEMPLATE): string {
  const s = dateTimeParts(slot.start);
  const e = dateTimeParts(slot.end);
  const sameDay = slot.start.slice(0, 10) === slot.end.slice(0, 10);
  const tokens: Record<string, string> = {
    '{年}': s.year,
    '{月}': s.month,
    '{日}': s.day,
    '{曜}': s.weekday,
    '{開始}': s.time,
    '{終了}': e.time,
    '{終了日}': sameDay ? '' : `${e.month}/${e.day}（${e.weekday}）`,
  };
  return template.replace(/\{(年|月|日|曜|開始|終了日|終了)\}/g, (t) => tokens[t]);
}

export const formatSlots = (slots: TimeSlot[], template?: string, bullet = '') =>
  sortSlots(slots)
    .map((s) => `${bullet}${formatSlot(s, template)}`)
    .join('\n');

/** URL-friendly keys for interview stages (used in API paths and page query strings). */
export const INTERVIEW_STAGE_KEYS = { first: '一次面接', second: '二次面接', final: '最終面接' } as const satisfies Record<
  string,
  InterviewStage
>;
export type InterviewStageKey = keyof typeof INTERVIEW_STAGE_KEYS;

export const isInterviewStageKey = (s: string): s is InterviewStageKey => s in INTERVIEW_STAGE_KEYS;

export const stageKeyOf = (stage: InterviewStage) =>
  (Object.keys(INTERVIEW_STAGE_KEYS) as InterviewStageKey[]).find((k) => INTERVIEW_STAGE_KEYS[k] === stage)!;
