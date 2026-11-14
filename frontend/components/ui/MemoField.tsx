'use client';

import { Pencil } from 'lucide-react';
import { useState } from 'react';
import AutoTextarea from './AutoTextarea';
import MarkdownView from './MarkdownView';
import { inputClass } from './styles';

interface Props {
  id: string;
  /** Omit when a section heading already names the memo; the hint is shown instead. */
  label?: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  /** Called when editing pauses: the textarea loses focus or editing is finished. */
  onCommit?: () => void;
  disabled?: boolean;
}

const tabClass = (active: boolean) =>
  `rounded-md px-3 py-1 text-xs font-medium ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`;

/**
 * Free-form memo shown as rendered Markdown, switched to an auto-growing textarea for editing.
 * Saving is up to the parent, notified through `onCommit`.
 */
export default function MemoField({ id, label, hint, value, onChange, onCommit, disabled }: Props) {
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState(false);

  const finish = () => {
    setEditing(false);
    onCommit?.();
  };

  const startEditing = () => {
    setPreview(false);
    setEditing(true);
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="block text-sm font-medium text-slate-700" htmlFor={editing && !preview ? id : undefined}>
          {label}
          {hint && <span className={`text-xs font-normal text-slate-400 ${label ? 'ml-2' : ''}`}>{hint}</span>}
        </label>
        {editing ? (
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
              <button type="button" className={tabClass(!preview)} onClick={() => setPreview(false)}>
                編集
              </button>
              <button type="button" className={tabClass(preview)} onClick={() => setPreview(true)}>
                プレビュー
              </button>
            </div>
            <button
              type="button"
              onClick={finish}
              className="rounded-md px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
            >
              完了
            </button>
          </div>
        ) : (
          value.trim() && (
            <button
              type="button"
              onClick={startEditing}
              disabled={disabled}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              <Pencil size={12} aria-hidden />
              編集
            </button>
          )
        )}
      </div>

      {!editing ? (
        value.trim() ? (
          <MarkdownView text={value} className="rounded-md border border-slate-200 bg-slate-50/50 px-4 py-3" />
        ) : (
          <button
            type="button"
            onClick={startEditing}
            disabled={disabled}
            className="w-full rounded-md border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-400 hover:border-slate-400 hover:text-slate-600"
          >
            クリックしてメモを追加
          </button>
        )
      ) : preview ? (
        <MarkdownView
          text={value.trim() ? value : '（内容がありません）'}
          className="min-h-[10rem] rounded-md border border-slate-200 px-4 py-3"
        />
      ) : (
        <>
          <AutoTextarea
            id={id}
            rows={8}
            autoFocus
            disabled={disabled}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onCommit}
            onKeyDown={(e) => e.key === 'Escape' && finish()}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-500">
            Markdown が使えます（**太字**、- 箇条書き、## 見出し、| 表 | など）。URL は自動でリンクになります。Esc
            で完了。
          </p>
        </>
      )}
    </div>
  );
}
