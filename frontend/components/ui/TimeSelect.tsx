'use client';

const STEP_MINUTES = 15;

/** "00:00", "00:15", ... "23:45" */
export const TIME_OPTIONS = Array.from({ length: (24 * 60) / STEP_MINUTES }, (_, i) => {
  const minutes = i * STEP_MINUTES;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

interface Props {
  value: string; // HH:mm or ''
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLSelectElement>;
}

/**
 * Time picker in 15-minute steps. A value outside the steps (e.g. imported "13:10")
 * is kept as an extra option so existing data is not silently changed.
 */
export default function TimeSelect({ value, onChange, disabled, className, id, onKeyDown }: Props) {
  const options = value && !TIME_OPTIONS.includes(value) ? [...TIME_OPTIONS, value].sort() : TIME_OPTIONS;
  return (
    <select
      id={id}
      aria-label="次回アクション時刻"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      className={className}
    >
      <option value="">--:--</option>
      {options.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}
