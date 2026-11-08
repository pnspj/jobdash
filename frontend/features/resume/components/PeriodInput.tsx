'use client';

import type { Period } from '@jobdash/shared';
import { inputBaseClass, inputClass } from '@/components/ui/styles';

interface Props {
  value: Period;
  onChange: (value: Period) => void;
  idPrefix: string;
}

/** Year-month range with a "現在" (ongoing) switch. */
export default function PeriodInput({ value, onChange, idPrefix }: Props) {
  const ongoing = value.to === undefined;
  return (
    <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
      <input
        id={`${idPrefix}-from`}
        type="month"
        aria-label="開始年月"
        value={value.from}
        onChange={(e) => onChange({ ...value, from: e.target.value })}
        className={`${inputBaseClass} w-40`}
      />
      <span className="text-slate-500">～</span>
      <input
        type="month"
        aria-label="終了年月"
        disabled={ongoing}
        value={value.to ?? ''}
        min={value.from}
        onChange={(e) => onChange({ ...value, to: e.target.value || undefined })}
        className={`${inputBaseClass} w-40`}
      />
      <label className="flex items-center gap-1 whitespace-nowrap text-sm text-slate-600">
        <input
          type="checkbox"
          checked={ongoing}
          onChange={(e) => onChange({ ...value, to: e.target.checked ? undefined : value.from })}
        />
        現在
      </label>
    </div>
  );
}
