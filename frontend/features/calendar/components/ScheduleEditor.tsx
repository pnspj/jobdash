'use client';

import type { DateSelectArg, EventChangeArg, EventClickArg, EventInput } from '@fullcalendar/core';
import {
  type Company,
  formatLocalDateTime,
  formatSlot,
  INTERVIEW_STAGE_KEYS,
  type InterviewStageKey,
  isClosedAction,
  normalizeSlots,
  type TimeSlot,
  toLocalDateTime,
} from '@jobdash/shared';
import { useEffect, useMemo, useState } from 'react';
import { dangerButton, errorBox, primaryButton, sectionClass } from '@/components/ui/styles';
import { useScheduleMutations } from '@/features/companies/api';
import { errorMessage } from '@/lib/apiClient';
import { interviewEvent, OTHER_COLOR, preferredEvent, STAGE_COLORS } from '../lib/events';
import { useCalendarSettings } from '../lib/settings';
import BaseCalendar from './BaseCalendar';
import SlotTextExport from './SlotTextExport';
import WeekStartToggle from './WeekStartToggle';

export type ScheduleMode = InterviewStageKey | 'preferred';

const MODES: { key: ScheduleMode; label: string }[] = [
  { key: 'first', label: '一次面接日時' },
  { key: 'second', label: '二次面接日時' },
  { key: 'final', label: '最終面接日時' },
  { key: 'preferred', label: '面接希望日時' },
];

const NEW_INTERVIEW_COLOR = '#16a34a'; // green-600
const OTHER_PREFERRED_BG = '#f1f5f9'; // slate-100
const OTHER_PREFERRED_TEXT = '#475569'; // slate-600

/** Event kinds used only on this screen. */
type Kind = 'other' | 'interview' | 'replaced' | 'pick' | 'draft-slot' | 'draft-interview';

const slotOf = (start: Date | null, end: Date | null): TimeSlot | null =>
  start && end ? { start: toLocalDateTime(start), end: toLocalDateTime(end) } : null;

const sameSlot = (a: TimeSlot | undefined | null, b: TimeSlot | undefined | null) =>
  !!a && !!b && a.start === b.start && a.end === b.end;

interface Props {
  company: Company;
  others: Company[];
  mode: ScheduleMode;
  onModeChange: (mode: ScheduleMode) => void;
}

/**
 * Week calendar for registering one company's interview of a stage or its preferred slots.
 * Drag on the calendar to create; drag/resize drafts to adjust; click a draft slot to remove it.
 * Other companies' interviews and preferred slots are shown in gray for reference.
 */
export default function ScheduleEditor({ company, others, mode, onModeChange }: Props) {
  const stage = mode === 'preferred' ? undefined : INTERVIEW_STAGE_KEYS[mode];
  const current = stage ? company.interviews?.find((i) => i.stage === stage) : undefined;
  const savedSlots = company.preferredSlots ?? [];

  const mutations = useScheduleMutations(company);
  const { settings, setSettings, firstDay } = useCalendarSettings();
  const [draftInterview, setDraftInterview] = useState<TimeSlot | null>(null);
  const [draftSlots, setDraftSlots] = useState<TimeSlot[]>(savedSlots);

  const dirty =
    mode === 'preferred'
      ? JSON.stringify(normalizeSlots(draftSlots)) !== JSON.stringify(savedSlots)
      : draftInterview !== null && !sameSlot(draftInterview, current);
  const busy =
    mutations.setInterview.isPending || mutations.removeInterview.isPending || mutations.setPreferredSlots.isPending;
  const error = mutations.setInterview.error ?? mutations.removeInterview.error ?? mutations.setPreferredSlots.error;

  // Warn before leaving the page with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const changeMode = (m: ScheduleMode) => {
    if (m === mode || (dirty && !window.confirm('保存していない変更があります。破棄して切り替えますか？'))) return;
    onModeChange(m);
  };

  const events = useMemo<EventInput[]>(() => {
    const list: EventInput[] = [];
    for (const o of others) {
      if (isClosedAction(o.action)) continue;
      for (const i of o.interviews ?? [])
        list.push({ ...interviewEvent(o, i, OTHER_COLOR), extendedProps: { kind: 'other' } });
      (o.preferredSlots ?? []).forEach((s, index) => {
        list.push({
          ...preferredEvent(o, s, index),
          backgroundColor: OTHER_PREFERRED_BG,
          borderColor: OTHER_COLOR,
          textColor: OTHER_PREFERRED_TEXT,
          extendedProps: { kind: 'other' },
        });
      });
    }
    for (const i of company.interviews ?? []) {
      const replaced = i.stage === stage && draftInterview && !sameSlot(draftInterview, i);
      list.push({
        ...interviewEvent(company, i),
        title: replaced ? `${i.stage}（変更前）` : i.stage,
        classNames: replaced ? ['jd-replaced'] : [],
        extendedProps: { kind: replaced ? 'replaced' : 'interview' },
      });
    }
    if (mode === 'preferred') {
      draftSlots.forEach((s, index) => {
        list.push({
          ...preferredEvent(company, s, index),
          id: `draft-slot:${index}`,
          title: '希望（クリックで削除）',
          editable: true,
          classNames: ['jd-preferred', 'jd-clickable'],
          extendedProps: { kind: 'draft-slot', index },
        });
      });
    } else {
      savedSlots.forEach((s, index) => {
        list.push({
          ...preferredEvent(company, s, index),
          title: '希望（クリックでこの日時に）',
          classNames: ['jd-preferred', 'jd-clickable'],
          extendedProps: { kind: 'pick', index },
        });
      });
      if (draftInterview && !sameSlot(draftInterview, current)) {
        list.push({
          id: 'draft-interview',
          title: `${stage}（新しい日時）`,
          start: draftInterview.start,
          end: draftInterview.end,
          editable: true,
          backgroundColor: NEW_INTERVIEW_COLOR,
          borderColor: NEW_INTERVIEW_COLOR,
          extendedProps: { kind: 'draft-interview' },
        });
      }
    }
    return list;
  }, [others, company, stage, current, mode, draftInterview, draftSlots, savedSlots]);

  const initialDate = (draftInterview ?? current ?? draftSlots[0] ?? savedSlots[0])?.start.slice(0, 10);

  const onSelect = (info: DateSelectArg) => {
    info.view.calendar.unselect();
    const slot = slotOf(info.start, info.end);
    if (!slot) return;
    if (mode === 'preferred') setDraftSlots((prev) => normalizeSlots([...prev, slot]));
    else setDraftInterview(slot);
  };

  const onEventClick = (info: EventClickArg) => {
    const { kind, index } = info.event.extendedProps as { kind: Kind; index?: number };
    if (kind === 'draft-slot' && index !== undefined) setDraftSlots((prev) => prev.filter((_, i) => i !== index));
    if (kind === 'pick' && index !== undefined) setDraftInterview(savedSlots[index]);
  };

  const onEventChange = (info: EventChangeArg) => {
    const { kind, index } = info.event.extendedProps as { kind: Kind; index?: number };
    const slot = slotOf(info.event.start, info.event.end);
    if (!slot) return info.revert();
    if (kind === 'draft-slot' && index !== undefined) {
      setDraftSlots((prev) => normalizeSlots(prev.map((s, i) => (i === index ? slot : s))));
    } else if (kind === 'draft-interview') {
      setDraftInterview(slot);
    } else {
      info.revert();
    }
  };

  const saveInterview = () => {
    if (!stage || !draftInterview) return;
    mutations.setInterview.mutate({ stage, slot: draftInterview }, { onSuccess: () => setDraftInterview(null) });
  };

  const removeInterview = () => {
    if (!stage || !window.confirm(`${stage}の日時を削除しますか？`)) return;
    mutations.removeInterview.mutate(stage, { onSuccess: () => setDraftInterview(null) });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
        {MODES.map((m) => {
          const registered =
            m.key === 'preferred'
              ? savedSlots.length > 0
              : company.interviews?.some((i) => i.stage === INTERVIEW_STAGE_KEYS[m.key as InterviewStageKey]);
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => changeMode(m.key)}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                m.key === mode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {m.label}
              {registered && <span className="ml-1 text-emerald-600">●</span>}
            </button>
          );
        })}
      </div>

      {error && <div className={errorBox}>{errorMessage(error, '保存に失敗しました')}</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <BaseCalendar
            initialDate={initialDate}
            firstDay={firstDay}
            headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
            selectable={!busy}
            selectMirror
            events={events}
            select={onSelect}
            eventClick={onEventClick}
            eventChange={onEventChange}
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              ドラッグで{mode === 'preferred' ? '希望日時を追加' : '面接日時を選択'}
              します。作成した予定はドラッグで移動、下端で時間を変更できます。灰色は他社の面接・面接希望日時です。
            </p>
            <WeekStartToggle
              weekStartsOnMonday={settings.weekStartsOnMonday}
              onChange={(weekStartsOnMonday) => setSettings((s) => ({ ...s, weekStartsOnMonday }))}
            />
          </div>
        </div>

        <aside className={`${sectionClass} space-y-4 self-start`}>
          {stage ? (
            <>
              <h2 className="font-semibold" style={{ color: STAGE_COLORS[stage] }}>
                {stage}
              </h2>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-slate-500">登録済みの日時</dt>
                  <dd className="font-medium">
                    {current ? formatSlot(current, '{月}/{日}（{曜}）{開始}～{終了日}{終了}') : '未登録'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">新しい日時</dt>
                  <dd className="font-medium text-green-700">
                    {dirty && draftInterview
                      ? formatSlot(draftInterview, '{月}/{日}（{曜}）{開始}～{終了日}{終了}')
                      : 'カレンダーをドラッグして選択'}
                  </dd>
                </div>
              </dl>
              {savedSlots.length > 0 && !dirty && (
                <p className="text-xs text-slate-500">オレンジの希望日時をクリックすると、その日時を選択できます。</p>
              )}
              {dirty && (
                <ul className="list-disc space-y-1 pl-4 text-xs text-amber-700">
                  {savedSlots.length > 0 && <li>保存すると面接希望日時（{savedSlots.length}件）は削除されます。</li>}
                  {!company.nextActionAt && draftInterview && (
                    <li>
                      次回アクション日時が未設定のため、{formatLocalDateTime(draftInterview.start)} に設定されます。
                    </li>
                  )}
                </ul>
              )}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={saveInterview} disabled={!dirty || busy} className={primaryButton}>
                  {mutations.setInterview.isPending ? '保存中...' : '保存'}
                </button>
                {dirty && (
                  <button
                    type="button"
                    onClick={() => setDraftInterview(null)}
                    disabled={busy}
                    className="text-sm text-slate-500 hover:underline"
                  >
                    取り消し
                  </button>
                )}
                {current && !dirty && (
                  <button type="button" onClick={removeInterview} disabled={busy} className={dangerButton}>
                    この日時を削除
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <h2 className="font-semibold text-amber-700">面接希望日時（{draftSlots.length}件）</h2>
              {draftSlots.length === 0 ? (
                <p className="text-sm text-slate-500">カレンダーをドラッグして追加してください。</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {draftSlots.map((s, i) => (
                    <li key={`${s.start}-${s.end}`} className="flex items-center justify-between gap-2">
                      <span className="tabular-nums">{formatSlot(s, '{月}/{日}（{曜}）{開始}～{終了日}{終了}')}</span>
                      <button
                        type="button"
                        onClick={() => setDraftSlots((prev) => prev.filter((_, j) => j !== i))}
                        aria-label="削除"
                        className="text-slate-400 hover:text-red-600"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => mutations.setPreferredSlots.mutate(normalizeSlots(draftSlots))}
                  disabled={!dirty || busy}
                  className={primaryButton}
                >
                  {mutations.setPreferredSlots.isPending ? '保存中...' : '保存'}
                </button>
                {dirty && (
                  <button
                    type="button"
                    onClick={() => setDraftSlots(savedSlots)}
                    disabled={busy}
                    className="text-sm text-slate-500 hover:underline"
                  >
                    変更を破棄
                  </button>
                )}
                {draftSlots.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDraftSlots([])}
                    disabled={busy}
                    className="text-sm text-red-600 hover:underline"
                  >
                    すべて削除
                  </button>
                )}
              </div>
              {dirty && <p className="text-xs text-amber-600">未保存の変更があります</p>}

              <div className="border-t border-slate-200 pt-4">
                <h3 className="mb-2 text-sm font-semibold">エージェント連絡用テキスト</h3>
                <SlotTextExport slots={draftSlots} />
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
