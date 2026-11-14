import { Check } from 'lucide-react';

interface Props {
  pending: boolean;
  /** Message of the last failed save, if it has not succeeded since. */
  error: string | null;
  /** There are edits not sent yet. */
  dirty?: boolean;
  /** At least one save succeeded on this screen. */
  saved: boolean;
  onRetry: () => void;
  /** Shown before anything happens, e.g. "変更は自動で保存されます". */
  idleText?: string;
}

/** Status of an autosaving section: saving / failed (with retry) / unsaved / saved. */
export default function SaveStatus({ pending, error, dirty = false, saved, onRetry, idleText }: Props) {
  if (pending) return <span className="text-xs font-normal text-slate-500">保存中...</span>;
  if (error)
    return (
      <span className="flex items-center gap-2 text-xs font-normal text-red-700">
        {error}
        <button type="button" onClick={onRetry} className="rounded border border-red-300 px-2 py-0.5 hover:bg-red-50">
          再試行
        </button>
      </span>
    );
  if (dirty) return <span className="text-xs font-normal text-slate-400">未保存の変更があります</span>;
  if (saved)
    return (
      <span className="flex items-center gap-1 text-xs font-normal text-emerald-700">
        <Check size={14} aria-hidden />
        保存しました
      </span>
    );
  return idleText ? <span className="text-xs font-normal text-slate-400">{idleText}</span> : null;
}
