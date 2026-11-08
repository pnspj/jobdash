'use client';

interface Props {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  max?: number;
  disabled?: boolean;
}

/** Clickable star rating. Clicking the current value clears it. */
export default function StarRating({ value, onChange, max = 3, disabled }: Props) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(value === n ? undefined : n)}
          aria-label={`${n}`}
          aria-pressed={value !== undefined && n <= value}
          className={`text-2xl leading-none transition-colors disabled:cursor-not-allowed ${
            value !== undefined && n <= value ? 'text-amber-400' : 'text-slate-300 hover:text-amber-200'
          }`}
        >
          ★
        </button>
      ))}
      <span className="ml-2 text-sm text-slate-500">{value ? `${value} / ${max}` : '未評価'}</span>
    </div>
  );
}
