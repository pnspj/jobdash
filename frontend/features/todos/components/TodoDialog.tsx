'use client';

import { joinLocalDateTime, splitLocalDateTime, type Todo, type TodoInput } from '@jobdash/shared';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { dangerButton, inputClass, labelClass, primaryButton, secondaryButton } from '@/components/ui/styles';
import TimeSelect from '@/components/ui/TimeSelect';
import { errorMessage } from '@/lib/apiClient';
import { useTodoMutations } from '../api';

interface Props {
  open: boolean;
  onClose: () => void;
  /** The to-do to edit; omit to add a new one. */
  todo?: Todo;
  /** Agent of a new to-do (undefined = dashboard to-do). Ignored when editing. */
  agentId?: string;
}

/** Add / edit a to-do: title, details, next action date-time and (when editing) status. */
export default function TodoDialog({ open, onClose, todo, agentId }: Props) {
  return (
    <Modal open={open} title={todo ? 'ToDoを編集' : 'ToDoを追加'} onClose={onClose}>
      {/* Remount per to-do so the form starts from its saved values */}
      {open && <TodoForm key={todo?.id ?? 'new'} todo={todo} agentId={agentId} onDone={onClose} onCancel={onClose} />}
    </Modal>
  );
}

interface FormProps {
  todo?: Todo;
  agentId?: string;
  /** Called after a successful save or delete. */
  onDone: () => void;
  onCancel: () => void;
}

/** The to-do form, also embedded in the dashboard's to-do list dialog. */
export function TodoForm({ todo, agentId, onDone, onCancel }: FormProps) {
  const { create, update, remove } = useTodoMutations();
  const initial = splitLocalDateTime(todo?.nextActionAt);
  const [title, setTitle] = useState(todo?.title ?? '');
  const [details, setDetails] = useState(todo?.details ?? '');
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [done, setDone] = useState(todo?.status === 'done');
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  // Focus the title when the dialog opens (the form is mounted on open)
  useEffect(() => titleRef.current?.focus(), []);
  const busy = create.isPending || update.isPending || remove.isPending;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const fields: TodoInput = {
      title,
      details,
      nextActionAt: joinLocalDateTime(date, time) ?? '',
      status: done ? 'done' : 'open',
    };
    try {
      if (todo) await update.mutateAsync({ todo, patch: fields });
      else await create.mutateAsync({ ...fields, ...(agentId && { agentId }) });
      onDone();
    } catch (err) {
      setError(errorMessage(err, '保存に失敗しました'));
    }
  };

  const handleDelete = async () => {
    if (!todo || !window.confirm(`「${todo.title}」を削除しますか？`)) return;
    try {
      await remove.mutateAsync(todo.id);
      onDone();
    } catch (err) {
      setError(errorMessage(err, '削除に失敗しました'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass} htmlFor="todo-title">
          項目名 <span className="text-red-500">*</span>
        </label>
        <input
          ref={titleRef}
          id="todo-title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="todo-details">
          詳細 <span className="text-xs font-normal text-slate-400">省略可</span>
        </label>
        <textarea
          id="todo-details"
          rows={3}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <span className={labelClass}>次回アクション日時</span>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            aria-label="次回アクション日"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${inputClass} w-40`}
          />
          <TimeSelect value={date ? time : ''} onChange={setTime} disabled={!date} className={`${inputClass} w-28`} />
          {(date || time) && (
            <button
              type="button"
              onClick={() => {
                setDate('');
                setTime('');
              }}
              className="text-sm text-slate-500 hover:underline"
            >
              クリア
            </button>
          )}
        </div>
      </div>
      {todo && (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} />
          完了
        </label>
      )}

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex items-center justify-between gap-2">
        <div>
          {todo && (
            <button type="button" onClick={handleDelete} disabled={busy} className={dangerButton}>
              削除
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className={secondaryButton}>
            キャンセル
          </button>
          <button type="submit" disabled={busy} className={primaryButton}>
            {busy ? '保存中...' : todo ? '保存する' : '追加する'}
          </button>
        </div>
      </div>
    </form>
  );
}
