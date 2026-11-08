'use client';

import { useState } from 'react';
import { joinLocalDateTime, splitLocalDateTime } from '@jobdash/shared';
import TimeSelect from '@/components/ui/TimeSelect';

interface Props {
  value: string | undefined; // nextActionAt
  disabled: boolean;
  onSave: (nextActionAt: string) => void; // '' clears
}

/**
 * Date + time editor with an explicit save, so partially entered values are never persisted.
 * Remount (via `key`) when the saved value changes to reset the draft.
 */
export default function NextActionEditor({ value, disabled, onSave }: Props) {
  const initial = splitLocalDateTime(value);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const draft = joinLocalDateTime(date, time) ?? '';
  const dirty = draft !== (value ?? '');

  const save = () => {
    if (dirty && !disabled) onSave(draft);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    }
  };
  const inputClass = 'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400';

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-slate-700">次回アクション日時</span>
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
        <button
          type="button"
          onClick={save}
          disabled={!dirty || disabled}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
        >
          保存
        </button>
        {(date || time) && (
          <button
            type="button"
            onClick={() => {
              setDate('');
              setTime('');
            }}
            disabled={disabled}
            className="text-sm text-slate-500 hover:text-slate-700 hover:underline"
          >
            クリア
          </button>
        )}
      </div>
      {dirty && <p className="mt-1 text-xs text-amber-600">未保存の変更があります</p>}
    </div>
  );
}
