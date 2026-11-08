'use client';

import { type DashboardRow, formatLocalDateTime, type Todo } from '@jobdash/shared';
import { useRouter } from 'next/navigation';
import { useAgentLookup } from '@/features/agents/api';
import { ActionBadge, PhaseBadge } from '@/features/companies/components/Badges';
import { useTodoMutations } from '@/features/todos/api';
import { dueClass } from '@/features/todos/components/TodoList';
import { withReturnTo } from '@/lib/returnTo';

const RETURN_TO = '/';

interface Props {
  rows: DashboardRow[];
  /** Open a dashboard to-do in the edit dialog. */
  onEditTodo: (todo: Todo) => void;
}

/**
 * The single dashboard table. Companies link to their detail, agent to-dos to the agent page,
 * dashboard to-dos open the edit dialog and can be completed with the checkbox.
 */
export default function DashboardTable({ rows, onEditTodo }: Props) {
  const router = useRouter();
  const { shortName } = useAgentLookup();
  const { update } = useTodoMutations();

  const open = (row: DashboardRow) => {
    if (row.kind === 'company') router.push(withReturnTo(`/companies/${row.id}`, RETURN_TO));
    else if (row.kind === 'agentTodo' && row.agentId) router.push(withReturnTo(`/agents/${row.agentId}`, RETURN_TO));
    else if (row.kind === 'todo') onEditTodo(row.todo);
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500">
          <tr>
            <th className="w-10 px-3 py-3">
              <span className="sr-only">完了</span>
            </th>
            <th className="px-4 py-3">企業名／項目名</th>
            <th className="px-4 py-3">エージェント</th>
            <th className="px-4 py-3">選考フェーズ</th>
            <th className="px-4 py-3">アクション</th>
            <th className="px-4 py-3">次回アクション日時</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => {
            const due = dueClass(row.nextActionAt);
            return (
              <tr
                key={`${row.kind}:${row.id}`}
                onClick={() => open(row)}
                className="cursor-pointer hover:bg-blue-50/50"
              >
                <td className="px-3 py-3">
                  {row.kind === 'todo' && (
                    <input
                      type="checkbox"
                      aria-label={`${row.title}を完了にする`}
                      disabled={update.isPending}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => update.mutate({ todo: row.todo, patch: { status: 'done' } })}
                    />
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={row.kind === 'company' ? 'font-medium text-slate-900' : 'text-slate-900'}>
                    {row.kind !== 'company' && (
                      <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">ToDo</span>
                    )}
                    {row.title}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{shortName(row.agentId) || ''}</td>
                <td className="px-4 py-3">{row.kind === 'company' && <PhaseBadge phase={row.phase} />}</td>
                <td className="px-4 py-3">{row.kind === 'company' && <ActionBadge action={row.action} />}</td>
                <td className={`whitespace-nowrap px-4 py-3 tabular-nums ${due}`}>
                  {formatLocalDateTime(row.nextActionAt) || '日時なし'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
