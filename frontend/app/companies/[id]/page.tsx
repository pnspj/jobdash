'use client';

import {
  ACTION_STATUSES,
  type ActionStatus,
  type Company,
  SELECTION_PHASES,
  type SelectionPhase,
} from '@jobdash/shared';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { PAGE_ICONS } from '@/components/layout/nav';
import PageTitle from '@/components/layout/PageTitle';
import ExternalLink from '@/components/ui/ExternalLink';
import { useAgentLookup } from '@/features/agents/api';
import InterviewSchedule from '@/features/calendar/components/InterviewSchedule';
import { useCompanies, useCompany, useDeleteCompany, useUpdateCompany } from '@/features/companies/api';
import { ActionBadge, PhaseBadge } from '@/features/companies/components/Badges';
import CompanyForm from '@/features/companies/components/CompanyForm';
import NextActionEditor from '@/features/companies/components/NextActionEditor';
import ResearchEditor from '@/features/companies/components/ResearchEditor';
import { ApiError, errorMessage } from '@/lib/apiClient';
import { returnLabel, useReturnTo } from '@/lib/returnTo';

const sectionClass = 'rounded-lg border border-slate-200 bg-white p-6 shadow-sm';
const selectClass = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm';

export default function CompanyDetailPage() {
  return (
    <Suspense fallback={<p className="py-12 text-center text-slate-500">読み込み中...</p>}>
      <CompanyDetailScreen />
    </Suspense>
  );
}

function CompanyDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const returnTo = useReturnTo();
  const { data: company, isPending, error, refetch } = useCompany(id);

  if (isPending) return <p className="py-12 text-center text-slate-500">読み込み中...</p>;

  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-slate-600">企業が見つかりませんでした。</p>
        <Link href={returnTo ?? '/companies'} className="text-blue-600 hover:underline">
          {returnLabel(returnTo)}へ戻る
        </Link>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
        {errorMessage(error, '取得に失敗しました')}
        <button type="button" onClick={() => refetch()} className="ml-3 underline">
          再読み込み
        </button>
      </div>
    );
  }

  return <CompanyDetail company={company} returnTo={returnTo} />;
}

function CompanyDetail({ company, returnTo }: { company: Company; returnTo: string | undefined }) {
  const router = useRouter();
  const update = useUpdateCompany(company);
  const remove = useDeleteCompany();
  const [editing, setEditing] = useState(false);
  const { data: allCompanies = [] } = useCompanies();
  // Tags used anywhere, most frequent first
  const tagSuggestions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of allCompanies) for (const t of c.research?.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [allCompanies]);
  const busy = update.isPending || remove.isPending;
  const error = update.error ?? remove.error;

  const handleDelete = () => {
    if (!window.confirm(`「${company.companyName}」を削除しますか？この操作は取り消せません。`)) return;
    remove.mutate(company.id, { onSuccess: () => router.push(returnTo ?? '/companies') });
  };

  return (
    <div className="space-y-6">
      <Link href={returnTo ?? '/companies'} className="text-sm text-blue-600 hover:underline">
        ← {returnLabel(returnTo)}へ戻る
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <PageTitle icon={PAGE_ICONS.companies}>{company.companyName}</PageTitle>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex gap-2">
              <PhaseBadge phase={company.phase} />
              <ActionBadge action={company.action} />
            </div>
            <CompanyLinks company={company} />
          </div>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              編集
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            削除
          </button>
        </div>
      </div>

      {error && !editing && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage(error, '更新に失敗しました')}
        </div>
      )}

      {editing ? (
        <section className={sectionClass}>
          <h2 className="mb-4 text-lg font-semibold">企業情報を編集</h2>
          <CompanyForm
            company={company}
            submitLabel="保存する"
            onSubmit={async (input) => {
              await update.mutateAsync(input);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        </section>
      ) : (
        <>
          <section className={sectionClass}>
            <h2 className="mb-4 text-lg font-semibold">
              選考状況の更新
              {update.isPending && <span className="ml-3 text-sm font-normal text-slate-400">保存中...</span>}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_minmax(22rem,1.5fr)]">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">選考フェーズ</span>
                <select
                  disabled={busy}
                  value={company.phase}
                  onChange={(e) => update.mutate({ phase: e.target.value as SelectionPhase })}
                  className={selectClass}
                >
                  {SELECTION_PHASES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">アクション</span>
                <select
                  disabled={busy}
                  value={company.action}
                  onChange={(e) => update.mutate({ action: e.target.value as ActionStatus })}
                  className={selectClass}
                >
                  {ACTION_STATUSES.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </label>
              <NextActionEditor
                key={company.nextActionAt ?? ''}
                value={company.nextActionAt}
                disabled={busy}
                onSave={(nextActionAt) => update.mutate({ nextActionAt })}
              />
            </div>
          </section>

          <section className={sectionClass}>
            <h2 className="mb-4 text-lg font-semibold">面接日程</h2>
            <InterviewSchedule company={company} returnTo={returnTo} />
          </section>

          <section className={sectionClass}>
            <ResearchEditor key={company.id} company={company} tagSuggestions={tagSuggestions} />
          </section>
        </>
      )}
    </div>
  );
}

/** Links to the company site, the job posting and the agent; only the available ones are shown. */
function CompanyLinks({ company }: { company: Company }) {
  const agent = useAgentLookup().get(company.agentId);
  const links = [
    company.companyUrl && (
      <ExternalLink key="company" href={company.companyUrl} marker>
        企業URL
      </ExternalLink>
    ),
    company.agentJobUrl && (
      <ExternalLink key="job" href={company.agentJobUrl} marker>
        求人URL
      </ExternalLink>
    ),
    agent ? (
      <Link key="agent" href={`/agents/${agent.id}`} title={agent.name} className="text-blue-700 hover:underline">
        {agent.shortName}
      </Link>
    ) : (
      company.agentId && (
        <span key="agent" className="text-slate-400">
          （不明なエージェント）
        </span>
      )
    ),
  ].filter(Boolean);
  if (links.length === 0) return null;
  return <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">{links}</div>;
}
