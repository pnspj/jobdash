'use client';

import { type Agent, companyComparator, type Todo } from '@jobdash/shared';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { PAGE_ICONS } from '@/components/layout/nav';
import PageTitle from '@/components/layout/PageTitle';
import ExternalLink from '@/components/ui/ExternalLink';
import { dangerButton, errorBox, secondaryButton, sectionClass } from '@/components/ui/styles';
import { useAgent, useDeleteAgent, useUpdateAgent } from '@/features/agents/api';
import AgentForm from '@/features/agents/components/AgentForm';
import AgentMemo from '@/features/agents/components/AgentMemo';
import { useCompanies } from '@/features/companies/api';
import CompanyTable from '@/features/companies/components/CompanyTable';
import { useTodos } from '@/features/todos/api';
import TodoDialog from '@/features/todos/components/TodoDialog';
import TodoList from '@/features/todos/components/TodoList';
import { ApiError, errorMessage } from '@/lib/apiClient';
import { returnLabel, useReturnTo } from '@/lib/returnTo';

export default function AgentDetailPage() {
  return (
    <Suspense fallback={<p className="py-12 text-center text-slate-500">読み込み中...</p>}>
      <AgentDetailScreen />
    </Suspense>
  );
}

function AgentDetailScreen() {
  const { id } = useParams<{ id: string }>();
  // Back-link target when opened from another page (e.g. the dashboard); default: agent list
  const returnTo = useReturnTo() ?? '/agents';
  const { data: agent, isPending, error } = useAgent(id);

  if (isPending) return <p className="py-12 text-center text-slate-500">読み込み中...</p>;
  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-slate-600">エージェントが見つかりませんでした。</p>
        <Link href={returnTo} className="text-blue-600 hover:underline">
          {returnLabel(returnTo)}へ戻る
        </Link>
      </div>
    );
  }
  if (!agent) return <div className={errorBox}>{errorMessage(error, '取得に失敗しました')}</div>;
  return <AgentDetail agent={agent} returnTo={returnTo} />;
}

function AgentDetail({ agent, returnTo }: { agent: Agent; returnTo: string }) {
  const router = useRouter();
  const update = useUpdateAgent(agent);
  const remove = useDeleteAgent();
  const { data: companies = [] } = useCompanies();
  const [editing, setEditing] = useState(false);
  const { data: allTodos = [] } = useTodos();
  const todos = useMemo(() => allTodos.filter((t) => t.agentId === agent.id), [allTodos, agent.id]);
  // undefined = closed, null = adding, Todo = editing
  const [dialogTodo, setDialogTodo] = useState<Todo | null | undefined>(undefined);

  const linked = useMemo(
    () => companies.filter((c) => c.agentId === agent.id).sort(companyComparator(() => agent.shortName)),
    [companies, agent],
  );

  const handleDelete = () => {
    const note = todos.length > 0 ? `\nこのエージェントのToDo ${todos.length}件も削除されます。` : '';
    if (!window.confirm(`「${agent.name}」を削除しますか？${note}`)) return;
    remove.mutate(agent.id, { onSuccess: () => router.push(returnTo) });
  };

  return (
    <div className="space-y-6">
      <Link href={returnTo} className="text-sm text-blue-600 hover:underline">
        ← {returnLabel(returnTo)}へ戻る
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <PageTitle icon={PAGE_ICONS.agents}>{agent.name}</PageTitle>
          <p className="mt-1 font-mono text-sm text-slate-500">{agent.shortName}</p>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <button type="button" onClick={() => setEditing(true)} className={secondaryButton}>
              編集
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={remove.isPending || linked.length > 0}
            title={linked.length > 0 ? '企業が紐づいているため削除できません' : undefined}
            className={dangerButton}
          >
            削除
          </button>
        </div>
      </div>

      {remove.error && <div className={errorBox}>{errorMessage(remove.error, '削除に失敗しました')}</div>}

      {editing ? (
        <section className={sectionClass}>
          <h2 className="mb-4 text-lg font-semibold">エージェント情報を編集</h2>
          <AgentForm
            agent={agent}
            submitLabel="保存する"
            onSubmit={async (input) => {
              await update.mutateAsync(input);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        </section>
      ) : (
        <section className={sectionClass}>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="font-medium text-slate-500">エージェント名</dt>
            <dd>{agent.name}</dd>
            <dt className="font-medium text-slate-500">略称</dt>
            <dd className="font-mono">{agent.shortName}</dd>
            <dt className="font-medium text-slate-500">担当者名</dt>
            <dd>{agent.contactName || '-'}</dd>
            <dt className="font-medium text-slate-500">メールアドレス</dt>
            <dd>
              {agent.contactEmail ? (
                <a href={`mailto:${agent.contactEmail}`} className="text-blue-700 hover:underline">
                  {agent.contactEmail}
                </a>
              ) : (
                '-'
              )}
            </dd>
            <dt className="font-medium text-slate-500">電話番号</dt>
            <dd>{agent.contactPhone || '-'}</dd>
            <dt className="font-medium text-slate-500">エージェントURL</dt>
            <dd className="break-all">
              <ExternalLink href={agent.url} />
            </dd>
          </dl>
        </section>
      )}

      <section className={sectionClass}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">ToDo（未完了 {todos.filter((t) => t.status === 'open').length}）</h2>
          <button type="button" onClick={() => setDialogTodo(null)} className={secondaryButton}>
            ＋ ToDoを追加
          </button>
        </div>
        <TodoList todos={todos} onEdit={setDialogTodo} emptyMessage="未完了のToDoはありません。" />
        <TodoDialog
          open={dialogTodo !== undefined}
          todo={dialogTodo ?? undefined}
          agentId={agent.id}
          onClose={() => setDialogTodo(undefined)}
        />
      </section>

      <section className={sectionClass}>
        <AgentMemo key={agent.id} agent={agent} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">紐づく企業（{linked.length}）</h2>
        {linked.length > 0 ? (
          <CompanyTable companies={linked} returnTo={`/agents/${agent.id}`} />
        ) : (
          <p className="text-sm text-slate-500">紐づく企業はありません。</p>
        )}
      </section>
    </div>
  );
}
