'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { companyComparator, type Agent } from '@jobdash/shared';
import { ApiError, errorMessage } from '@/lib/apiClient';
import ExternalLink from '@/components/ui/ExternalLink';
import { dangerButton, errorBox, secondaryButton, sectionClass } from '@/components/ui/styles';
import { useAgent, useDeleteAgent, useUpdateAgent } from '@/features/agents/api';
import AgentForm from '@/features/agents/components/AgentForm';
import { useCompanies } from '@/features/companies/api';
import CompanyTable from '@/features/companies/components/CompanyTable';

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: agent, isPending, error } = useAgent(id);

  if (isPending) return <p className="py-12 text-center text-slate-500">読み込み中...</p>;
  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-slate-600">エージェントが見つかりませんでした。</p>
        <Link href="/agents" className="text-blue-600 hover:underline">
          一覧へ戻る
        </Link>
      </div>
    );
  }
  if (!agent) return <div className={errorBox}>{errorMessage(error, '取得に失敗しました')}</div>;
  return <AgentDetail agent={agent} />;
}

function AgentDetail({ agent }: { agent: Agent }) {
  const router = useRouter();
  const update = useUpdateAgent(agent);
  const remove = useDeleteAgent();
  const { data: companies = [] } = useCompanies();
  const [editing, setEditing] = useState(false);

  const linked = useMemo(
    () => companies.filter((c) => c.agentId === agent.id).sort(companyComparator(() => agent.shortName)),
    [companies, agent],
  );

  const handleDelete = () => {
    if (!window.confirm(`「${agent.name}」を削除しますか？`)) return;
    remove.mutate(agent.id, { onSuccess: () => router.push('/agents') });
  };

  return (
    <div className="space-y-6">
      <Link href="/agents" className="text-sm text-blue-600 hover:underline">
        ← エージェント一覧へ戻る
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{agent.name}</h1>
          <p className="mt-1 font-mono text-sm text-slate-500">{agent.shortName}</p>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <button onClick={() => setEditing(true)} className={secondaryButton}>
              編集
            </button>
          )}
          <button
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
            <dt className="font-medium text-slate-500">メモ</dt>
            <dd className="whitespace-pre-wrap break-words">{agent.memo || '-'}</dd>
          </dl>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">紐づく企業（{linked.length}）</h2>
        {linked.length > 0 ? (
          <CompanyTable companies={linked} />
        ) : (
          <p className="text-sm text-slate-500">紐づく企業はありません。</p>
        )}
      </section>
    </div>
  );
}
