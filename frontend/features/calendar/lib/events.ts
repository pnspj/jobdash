import type { EventInput } from '@fullcalendar/core';
import { type Company, type InterviewStage, isClosedAction, type TimeSlot } from '@jobdash/shared';

/** Colors per interview stage; preferred slots use amber. */
export const STAGE_COLORS: Record<InterviewStage, string> = {
  一次面接: '#2563eb', // blue-600
  二次面接: '#4f46e5', // indigo-600
  最終面接: '#7c3aed', // violet-600
};
export const PREFERRED_COLOR = '#d97706'; // amber-600
export const OTHER_COLOR = '#94a3b8'; // slate-400

export type CalendarEventKind = 'interview' | 'preferred';

export interface EventMeta {
  kind: CalendarEventKind;
  companyId: string;
  stage?: InterviewStage;
}

export const interviewEvent = (
  company: Company,
  i: { stage: InterviewStage } & TimeSlot,
  color = STAGE_COLORS[i.stage],
): EventInput => ({
  id: `interview:${company.id}:${i.stage}`,
  title: `${company.companyName} ${i.stage}`,
  start: i.start,
  end: i.end,
  backgroundColor: color,
  borderColor: color,
  extendedProps: { kind: 'interview', companyId: company.id, stage: i.stage } satisfies EventMeta,
});

export const preferredEvent = (company: Company, slot: TimeSlot, index: number): EventInput => ({
  id: `preferred:${company.id}:${index}`,
  title: `${company.companyName} 希望`,
  start: slot.start,
  end: slot.end,
  backgroundColor: '#fef3c7', // amber-100
  borderColor: PREFERRED_COLOR,
  textColor: '#92400e', // amber-800
  classNames: ['jd-preferred'],
  extendedProps: { kind: 'preferred', companyId: company.id } satisfies EventMeta,
});

export interface CalendarFilter {
  showPreferred: boolean;
  showClosed: boolean;
}

/** Events for the read-only calendar: interviews (and optionally preferred slots) of all companies. */
export function companyEvents(companies: Company[], filter: CalendarFilter): EventInput[] {
  return companies
    .filter((c) => filter.showClosed || !isClosedAction(c.action))
    .flatMap((c) => [
      ...(c.interviews ?? []).map((i) => interviewEvent(c, i)),
      ...(filter.showPreferred ? (c.preferredSlots ?? []).map((s, idx) => preferredEvent(c, s, idx)) : []),
    ]);
}
