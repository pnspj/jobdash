'use client';

import type { CalendarOptions } from '@fullcalendar/core';
import jaLocale from '@fullcalendar/core/locales/ja';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { forwardRef } from 'react';
import { offDayClassNames } from '../lib/offDays';

/**
 * FullCalendar with the app-wide defaults: Japanese, week starts Sunday unless `firstDay` is given,
 * 15-minute snapping, non-business days (weekends and Japanese holidays) shaded gray.
 */
const BaseCalendar = forwardRef<FullCalendar, CalendarOptions>(function BaseCalendar(props, ref) {
  return (
    <FullCalendar
      ref={ref}
      plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
      locale={jaLocale}
      firstDay={0}
      initialView="timeGridWeek"
      allDaySlot={false}
      nowIndicator
      slotDuration="00:30:00"
      snapDuration="00:15:00"
      slotMinTime="07:00:00"
      slotMaxTime="23:00:00"
      scrollTime="09:00:00"
      slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
      eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
      dayHeaderFormat={{ month: 'numeric', day: 'numeric', weekday: 'short' }}
      height={720}
      // Weekends and holidays are shaded the same light gray: only "business day or not" matters here
      dayCellClassNames={offDayClassNames}
      dayHeaderClassNames={offDayClassNames}
      {...props}
    />
  );
});

export default BaseCalendar;
