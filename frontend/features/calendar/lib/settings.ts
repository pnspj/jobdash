'use client';

import { usePersistentState } from '@/lib/usePersistentState';

export interface CalendarSettings {
  /** false = weeks start on Sunday (default), true = Monday. */
  weekStartsOnMonday: boolean;
}

/** Calendar display settings shared by the calendar and schedule screens (stored in localStorage). */
export function useCalendarSettings() {
  const [settings, setSettings] = usePersistentState<CalendarSettings>('jobdash.calendarSettings', {
    weekStartsOnMonday: false,
  });
  return {
    settings,
    setSettings,
    firstDay: settings.weekStartsOnMonday ? 1 : 0,
  };
}
