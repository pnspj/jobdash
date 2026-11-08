'use client';

import type { DatesSetArg, EventClickArg } from '@fullcalendar/core';
import { DATE_RE, INTERVIEW_STAGES, todayLocalDate } from '@jobdash/shared';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useRef } from 'react';
import { PAGE_ICONS } from '@/components/layout/nav';
import PageTitle from '@/components/layout/PageTitle';
import { errorBox } from '@/components/ui/styles';
import BaseCalendar from '@/features/calendar/components/BaseCalendar';
import WeekStartToggle from '@/features/calendar/components/WeekStartToggle';
import {
  type CalendarFilter,
  companyEvents,
  type EventMeta,
  PREFERRED_COLOR,
  STAGE_COLORS,
} from '@/features/calendar/lib/events';
import { useCalendarSettings } from '@/features/calendar/lib/settings';
import { useCompanies } from '@/features/companies/api';
import { errorMessage } from '@/lib/apiClient';
import { withReturnTo } from '@/lib/returnTo';
import { usePersistentState } from '@/lib/usePersistentState';

const VIEWS = ['timeGridWeek', 'dayGridMonth'] as const;
type View = (typeof VIEWS)[number];

const pad = (n: number) => String(n).padStart(2, '0');
const toDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function CalendarPage() {
  return (
    <Suspense fallback={<p className="py-12 text-center text-slate-500">読み込み中...</p>}>
      <CalendarScreen />
    </Suspense>
  );
}

/**
 * Read-only interview calendar. Registration is done from each company's detail page.
 * The current view and date are kept in the URL (?view=&date=) so that "back" from a company returns here.
 */
function CalendarScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const initialView: View = VIEWS.includes(params.get('view') as View) ? (params.get('view') as View) : 'timeGridWeek';
  const dateParam = params.get('date');
  const initialDate = dateParam && DATE_RE.test(dateParam) ? dateParam : todayLocalDate();
  // URL of the currently displayed range, used as the return target
  const currentUrl = useRef(`/calendar?view=${initialView}&date=${initialDate}`);

  const { data: companies = [], isPending, error } = useCompanies();
  const { settings, setSettings, firstDay } = useCalendarSettings();
  const [filter, setFilter] = usePersistentState<CalendarFilter>('jobdash.calendarFilter', {
    showPreferred: true,
    showClosed: false,
  });
  const events = useMemo(() => companyEvents(companies, filter), [companies, filter]);

  const onDatesSet = (info: DatesSetArg) => {
    // Month views start on the 1st; week views on their first day
    const url = `/calendar?view=${info.view.type}&date=${toDate(info.view.currentStart)}`;
    currentUrl.current = url;
    window.history.replaceState(window.history.state, '', url);
  };

  const onEventClick = (info: EventClickArg) => {
    const { companyId } = info.event.extendedProps as EventMeta;
    router.push(withReturnTo(`/companies/${companyId}`, currentUrl.current));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageTitle icon={PAGE_ICONS.calendar}>面接カレンダー</PageTitle>
          <p className="text-sm text-slate-500">
            予定の登録・変更は企業の詳細画面から行います。予定をクリックすると企業の詳細へ移動します。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
          <WeekStartToggle
            weekStartsOnMonday={settings.weekStartsOnMonday}
            onChange={(weekStartsOnMonday) => setSettings((s) => ({ ...s, weekStartsOnMonday }))}
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filter.showPreferred}
              onChange={(e) => setFilter((f) => ({ ...f, showPreferred: e.target.checked }))}
            />
            希望日時も表示
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filter.showClosed}
              onChange={(e) => setFilter((f) => ({ ...f, showClosed: e.target.checked }))}
            />
            辞退・不通過の企業も表示
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
        {INTERVIEW_STAGES.map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: STAGE_COLORS[s] }} />
            {s}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-3 w-3 rounded-sm border-2 border-dashed bg-amber-100"
            style={{ borderColor: PREFERRED_COLOR }}
          />
          面接希望日時
        </span>
      </div>

      {error && <div className={errorBox}>{errorMessage(error, '取得に失敗しました')}</div>}

      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        {isPending ? (
          <p className="py-12 text-center text-slate-500">読み込み中...</p>
        ) : (
          <BaseCalendar
            initialView={initialView}
            initialDate={initialDate}
            firstDay={firstDay}
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridWeek,dayGridMonth' }}
            buttonText={{ week: '週', month: '月', today: '今日' }}
            events={events}
            eventClick={onEventClick}
            datesSet={onDatesSet}
            eventClassNames="jd-clickable"
            dayMaxEvents={4}
          />
        )}
      </div>
    </div>
  );
}
