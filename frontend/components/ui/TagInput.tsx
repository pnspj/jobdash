'use client';

import { type KeyboardEvent, useId, useState } from 'react';

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  max?: number;
  disabled?: boolean;
  /** Label for the first tag, e.g. "代表". */
  firstLabel?: string;
}

/**
 * Free-form tag editor. Enter / comma adds a tag, Backspace on an empty input removes the last one.
 * Tags keep their order; any tag can be moved to the front.
 */
export default function TagInput({ value, onChange, suggestions = [], max = 20, disabled, firstLabel }: Props) {
  const [text, setText] = useState('');
  const listId = useId();

  const add = (raw: string) => {
    const tags = raw
      .split(/[,、]/)
      .map((t) => t.trim())
      .filter((t) => t !== '' && !value.includes(t));
    if (tags.length > 0) onChange([...value, ...tags].slice(0, max));
    setText('');
  };
  const remove = (tag: string) => onChange(value.filter((t) => t !== tag));
  const moveToFront = (tag: string) => onChange([tag, ...value.filter((t) => t !== tag)]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return; // IME conversion in progress
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(text);
    } else if (e.key === 'Backspace' && text === '' && value.length > 0) {
      remove(value[value.length - 1]);
    }
  };

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 py-1.5 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
      {value.map((tag, i) => (
        <span
          key={tag}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            i === 0 ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300' : 'bg-slate-100 text-slate-700'
          }`}
        >
          {i === 0 && firstLabel && <span className="text-[10px] text-blue-600">{firstLabel}</span>}
          {tag}
          {i > 0 && !disabled && (
            <button
              type="button"
              onClick={() => moveToFront(tag)}
              title="先頭に移動"
              className="text-slate-400 hover:text-blue-600"
            >
              ⇤
            </button>
          )}
          {!disabled && (
            <button
              type="button"
              onClick={() => remove(tag)}
              aria-label={`${tag} を削除`}
              className="text-slate-400 hover:text-red-600"
            >
              ×
            </button>
          )}
        </span>
      ))}
      {value.length < max && (
        <input
          list={listId}
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => text.trim() && add(text)}
          placeholder={value.length === 0 ? '入力して Enter（例: 自社サービス）' : ''}
          className="min-w-32 flex-1 border-0 bg-transparent px-1 py-0.5 text-sm outline-none"
        />
      )}
      <datalist id={listId}>
        {suggestions
          .filter((s) => !value.includes(s))
          .map((s) => (
            <option key={s} value={s} />
          ))}
      </datalist>
    </div>
  );
}
