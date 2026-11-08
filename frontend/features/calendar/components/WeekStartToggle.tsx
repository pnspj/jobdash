'use client';

interface Props {
  weekStartsOnMonday: boolean;
  onChange: (weekStartsOnMonday: boolean) => void;
}

/** Sunday / Monday week-start switch. */
export default function WeekStartToggle({ weekStartsOnMonday, onChange }: Props) {
  const option = (monday: boolean, label: string) => (
    <button
      type="button"
      onClick={() => onChange(monday)}
      aria-pressed={weekStartsOnMonday === monday}
      className={`px-2.5 py-1 ${weekStartsOnMonday === monday ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'} rounded`}
    >
      {label}
    </button>
  );
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-600">
      週の開始
      <span className="inline-flex rounded-md bg-slate-100 p-0.5 text-xs font-medium">
        {option(false, '日曜')}
        {option(true, '月曜')}
      </span>
    </span>
  );
}
