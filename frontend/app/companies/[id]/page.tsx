'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ACTION_STATUSES,
  SELECTION_PHASES,
  formatLocalDateTime,
  type ActionStatus,
  type Company,
  type SelectionPhase,
} from '@jobdash/shared';
import { ApiError, errorMessage } from '@/lib/apiClient';
import ExternalLink from '@/components/ui/ExternalLink';
import { useCompany, useDeleteCompany, useUpdateCompany } from '@/features/companies/api';
import { ActionBadge, PhaseBadge } from '@/features/companies/components/Badges';
import CompanyForm from '@/features/companies/components/CompanyForm';
import NextActionEditor from '@/features/companies/components/NextActionEditor';

const sectionClass = 'rounded-lg border border-slate-200 bg-white p-6 shadow-sm';
const selectClass = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm';

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: company, isPending, error, refetch } = useCompany(id);

  if (isPending) return <p className="py-12 text-center text-slate-500">読み込み中...</p>;

  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-slate-600">企業が見つかりませんでした。</p>
        <Link href="/" className="text-blue-600 hover:underline">
          一覧へ戻る
        </Link>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
        {errorMessage(error, '取得に失敗しました')}
        <button onClick={() => refetch()} className="ml-3 underline">
          再読み込み
        </button>
      </div>
    );
  }

  return <CompanyDetail company={company} />;
}

function CompanyDetail({ company }: { company: Company }) {
  const router = useRouter();
  const update = useUpdateCompany(company);
  const remove = useDeleteCompany();
  const [editing, setEditing] = useState(false);
  const busy = update.isPending || remove.isPending;
  const error = update.error ?? remove.error;

  const handleDelete = () => {
    if (!window.confirm(`「${company.companyName}」を削除しますか？この操作は取り消せません。`)) return;
    remove.mutate(company.id, { onSuccess: () => router.push('/') });
  };

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← 一覧へ戻る
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{company.companyName}</h1>
          <div className="mt-2 flex gap-2">
            <PhaseBadge phase={company.phase} />
            <ActionBadge action={company.action} />
          </div>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              編集
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={busy}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            削除
          </button>
        </div>
      </div>

      {error && !editing && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage(error, '更新に失敗しました')}</div>
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
            <h2 className="mb-4 text-lg font-semibold">企業情報</h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-[10rem_1fr]">
              <dt className="font-medium text-slate-500">会社名</dt>
              <dd>{company.companyName}</dd>

              <dt className="font-medium text-slate-500">会社URL</dt>
              <dd className="break-all">
                <ExternalLink href={company.companyUrl} />
              </dd>

              <dt className="font-medium text-slate-500">担当エージェント</dt>
              <dd>{company.agent || '-'}</dd>

              <dt className="font-medium text-slate-500">エージェント求人URL</dt>
              <dd className="break-all">
                <ExternalLink href={company.agentJobUrl} />
              </dd>

              <dt className="font-medium text-slate-500">選考フェーズ</dt>
              <dd>{company.phase}</dd>

              <dt className="font-medium text-slate-500">アクション</dt>
              <dd>{company.action}</dd>

              <dt className="font-medium text-slate-500">次回アクション日時</dt>
              <dd className="tabular-nums">{formatLocalDateTime(company.nextActionAt) || '-'}</dd>

              <dt className="font-medium text-slate-500">詳細</dt>
              <dd className="whitespace-pre-wrap break-words">{company.details || '-'}</dd>

              <dt className="font-medium text-slate-500">更新日時</dt>
              <dd className="tabular-nums">{new Date(company.updatedAt).toLocaleString('ja-JP')}</dd>

              <dt className="font-medium text-slate-500">ID</dt>
              <dd className="font-mono text-xs text-slate-400">{company.id}</dd>
            </dl>
          </section>
        </>
      )}
    </div>
  );
}
