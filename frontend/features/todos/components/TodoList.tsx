'use client';

import { compareTodos, formatLocalDateTime, type Todo, todayLocalDate } from '@jobdash/shared';
import { useState } from 'react';
import { errorMessage } from '@/lib/apiClient';
import { useTodoMutations } from '../api';

interface Props {
  todos: Todo[];
  /** Open a to-do for editing (row click). */
  onEdit: (todo: Todo) => void;
  /** Show done to-dos below the open ones (collapsed by default). */
  showDone?: boolean;
  emptyMessage?: string;
}

/** Due-date color: overdue red, today amber (same rule as the company list). */
export function dueClass(nextActionAt: string | undefined, today = todayLocalDate()): string {
  const date = nextActionAt?.slice(0, 10);
  if (!date) return 'text-slate-400';
  if (date < today) return 'font-semibold text-red-600';
  if (date === today) return 'font-semibold text-amber-600';
  return 'text-slate-700';
}

function TodoRow({ todo, onEdit }: { todo: Todo; onEdit: (todo: Todo) => void }) {
  const { update } = useTodoMutations();
  const done = todo.status === 'done';
  return (
    <li className="flex items-start gap-3 px-3 py-2 hover:bg-blue-50/50">
      <input
        type="checkbox"
        aria-label={`${todo.title}を${done ? '未完了に戻す' : '完了にする'}`}
        checked={done}
        disabled={update.isPending}
        onChange={() => update.mutate({ todo, patch: { status: done ? 'open' : 'done' } })}
        className="mt-1"
      />
      <button type="button" onClick={() => onEdit(todo)} className="min-w-0 flex-1 text-left">
        <span className={`block ${done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{todo.title}</span>
        {todo.details && <span className="block truncate text-xs text-slate-500">{todo.details}</span>}
        {update.error && (
          <span className="block text-xs text-red-600">{errorMessage(update.error, '更新に失敗しました')}</span>
        )}
      </button>
      <span className={`shrink-0 text-sm tabular-nums ${done ? 'text-slate-400' : dueClass(todo.nextActionAt)}`}>
        {formatLocalDateTime(todo.nextActionAt) || (done ? '' : '日時なし')}
      </span>
    </li>
  );
}

/** Checkbox list of to-dos: tick to complete, click the title to edit. */
export default function TodoList({ todos, onEdit, showDone = true, emptyMessage = 'ToDoはありません。' }: Props) {
  const [doneOpen, setDoneOpen] = useState(false);
  const sorted = [...todos].sort(compareTodos);
  const open = sorted.filter((t) => t.status === 'open');
  const done = sorted.filter((t) => t.status === 'done');

  return (
    <div className="space-y-2">
      {open.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
          {open.map((t) => (
            <TodoRow key={t.id} todo={t} onEdit={onEdit} />
          ))}
        </ul>
      )}
      {showDone && done.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setDoneOpen((v) => !v)}
            className="text-sm text-slate-500 hover:underline"
          >
            {doneOpen ? '▼' : '▶'} 完了済み（{done.length}）
          </button>
          {doneOpen && (
            <ul className="mt-1 divide-y divide-slate-100 rounded-md border border-slate-200">
              {done.map((t) => (
                <TodoRow key={t.id} todo={t} onEdit={onEdit} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
