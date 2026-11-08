'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ApiError, deleteCompany, fetchCompany, toInput, updateCompany } from '@/lib/api';
import { ACTION_STATUSES, SELECTION_PHASES, type CompanyInput, type CompanyRecord } from '@/lib/types';
import { ActionBadge, PhaseBadge } from '@/components/Badges';
import CompanyForm from '@/components/CompanyForm';

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [company, setCompany] = useState<CompanyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCompany(await fetchCompany(id));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNotFound(true);
      else setError(err instanceof Error ? err.message : '取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (input: CompanyInput) => {
    const updated = await updateCompany(id, input);
    setCompany(updated);
  };

  /** Quick update of a single field (phase / action / nextActionDate). */
  const quickUpdate = async (patch: Partial<CompanyInput>) => {
    if (!company) return;
    setSaving(true);
    setError(null);
    try {
      await save({ ...toInput(company), ...patch });
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!company || !window.confirm(`「${company.companyName}」を削除しますか？この操作は取り消せません。`)) return;
    try {
      await deleteCompany(id);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };

  if (loading) return <p className="py-12 text-center text-slate-500">読み込み中...</p>;

  if (notFound) {
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
        {error}
        <button onClick={load} className="ml-3 underline">
          再読み込み
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← 一覧へ戻る
        </Link>
      </div>

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
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            削除
          </button>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {editing ? (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">企業情報を編集</h2>
          <CompanyForm
            initialValue={toInput(company)}
            submitLabel="保存する"
            onSubmit={async (input) => {
              await save(input);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        </section>
      ) : (
        <>
          {/* Quick status update */}
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">
              選考状況の更新
              {saving && <span className="ml-3 text-sm font-normal text-slate-400">保存中...</span>}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">選考フェーズ</span>
                <select
                  disabled={saving}
                  value={company.phase}
                  onChange={(e) => quickUpdate({ phase: e.target.value as CompanyInput['phase'] })}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {SELECTION_PHASES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">アクション</span>
                <select
                  disabled={saving}
                  value={company.action}
                  onChange={(e) => quickUpdate({ action: e.target.value as CompanyInput['action'] })}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {ACTION_STATUSES.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">次回アクション日時</span>
                <div className="flex gap-2">
                  <input
                    type="date"
                    disabled={saving}
                    value={company.nextActionDate}
                    onChange={(e) => quickUpdate({ nextActionDate: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    type="time"
                    aria-label="次回アクション時刻"
                    disabled={saving || !company.nextActionDate}
                    defaultValue={company.nextActionTime ?? ''}
                    key={`${company.updatedAt}-time`}
                    // Save on blur: onChange fires per segment while typing a time
                    onBlur={(e) => {
                      if (e.target.value !== (company.nextActionTime ?? '')) void quickUpdate({ nextActionTime: e.target.value });
                    }}
                    className="w-28 shrink-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </label>
            </div>
          </section>

          {/* All fields */}
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">企業情報</h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-[10rem_1fr]">
              <dt className="font-medium text-slate-500">会社名</dt>
              <dd>{company.companyName}</dd>

              <dt className="font-medium text-slate-500">会社URL</dt>
              <dd>
                <ExternalLink url={company.companyUrl} />
              </dd>

              <dt className="font-medium text-slate-500">担当エージェント</dt>
              <dd>{company.agent || '-'}</dd>

              <dt className="font-medium text-slate-500">エージェント求人URL</dt>
              <dd>
                <ExternalLink url={company.agentJobUrl} />
              </dd>

              <dt className="font-medium text-slate-500">選考フェーズ</dt>
              <dd>{company.phase}</dd>

              <dt className="font-medium text-slate-500">アクション</dt>
              <dd>{company.action}</dd>

              <dt className="font-medium text-slate-500">次回アクション日</dt>
              <dd className="tabular-nums">
                {company.nextActionDate ? `${company.nextActionDate} ${company.nextActionTime ?? ''}`.trim() : '-'}
              </dd>

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

function ExternalLink({ url }: { url?: string }) {
  if (!url) return <>-</>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="break-all text-blue-600 hover:underline">
      {url}
    </a>
  );
}
