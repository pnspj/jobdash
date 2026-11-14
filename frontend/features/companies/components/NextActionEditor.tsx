'use client';

import { joinLocalDateTime, splitLocalDateTime } from '@jobdash/shared';
import { type FocusEvent, useEffect, useRef, useState } from 'react';
import TimeSelect from '@/components/ui/TimeSelect';

interface Props {
  value: string | undefined; // nextActionAt
  disabled?: boolean;
  onSave: (nextActionAt: string) => void; // '' clears
}

/**
 * Date + time editor saved automatically when focus leaves the pair (or on Enter, or by "クリア").
 * Not on every change: while typing a year the date input reports values like 0002-11-14.
 */
export default function NextActionEditor({ value, disabled = false, onSave }: Props) {
  const [date, setDate] = useState(() => splitLocalDateTime(value).date);
  const [time, setTime] = useState(() => splitLocalDateTime(value).time);
  const draft = joinLocalDateTime(date, time) ?? '';
  const dirty = draft !== (value ?? '');
  const container = useRef<HTMLFieldSetElement>(null);

  // Follow the saved value (e.g. after saving, or an interview set the date) unless the user is editing
  useEffect(() => {
    if (container.current?.contains(document.activeElement)) return;
    const next = splitLocalDateTime(value);
    setDate(next.date);
    setTime(next.time);
  }, [value]);

  const save = () => {
    if (dirty && !disabled) onSave(draft);
  };
  const onBlur = (e: FocusEvent) => {
    // Moving between the date and time inputs is still editing
    if (!container.current?.contains(e.relatedTarget as Node | null)) save();
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    }
  };
  const clear = () => {
    setDate('');
    setTime('');
    if (value && !disabled) onSave('');
  };
  const inputClass =
    'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400';

  return (
    <fieldset ref={container} onBlur={onBlur} className="min-w-0">
      <legend className="mb-1 block text-sm font-medium text-slate-700">次回アクション日時</legend>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          aria-label="次回アクション日"
          disabled={disabled}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          onKeyDown={onKeyDown}
          className={`${inputClass} w-40`}
        />
        <TimeSelect
          disabled={disabled || !date}
          value={date ? time : ''}
          onChange={setTime}
          onKeyDown={onKeyDown}
          className={`${inputClass} w-28`}
        />
        {(date || time) && (
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            className="text-sm text-slate-500 hover:text-slate-700 hover:underline"
          >
            クリア
          </button>
        )}
      </div>
      {dirty && <p className="mt-1 text-xs text-slate-500">欄の外をクリックするか Enter で保存されます</p>}
    </fieldset>
  );
}
