'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createCompany, fetchCompanies } from '@/lib/api';
import { downloadCsv } from '@/lib/csv';
import { companiesToCsvRows } from '@/lib/csvMapping';
import type { CompanyInput, CompanyRecord } from '@/lib/types';
import { ActionBadge, PhaseBadge, isActionRequired } from '@/components/Badges';
import CompanyForm from '@/components/CompanyForm';
import Modal from '@/components/Modal';

const today = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD in local time

/** Sort by next action date ascending; records without a date go last. */
const byNextActionDate = (a: CompanyRecord, b: CompanyRecord) => {
  if (!a.nextActionDate && !b.nextActionDate) return b.updatedAt.localeCompare(a.updatedAt);
  if (!a.nextActionDate) return 1;
  if (!b.nextActionDate) return -1;
  return (
    a.nextActionDate.localeCompare(b.nextActionDate) ||
    // Within the same day, timed entries come first in time order
    (a.nextActionTime ?? '99:99').localeCompare(b.nextActionTime ?? '99:99')
  );
};

export default function CompanyListPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCompanies(await fetchCompanies());
    } catch (err) {
      setError(err instanceof Error ? err.message : '一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => companies.filter((c) => showClosed || c.action !== '辞退/不通過').sort(byNextActionDate),
    [companies, showClosed],
  );
  const closedCount = companies.filter((c) => c.action === '辞退/不通過').length;

  const handleCreate = async (input: CompanyInput) => {
    await createCompany(input);
    setModalOpen(false);
    await load();
  };

  const todayStr = today();

  const handleExport = () => {
    const sorted = [...companies].sort(byNextActionDate);
    downloadCsv(`jobdash-${todayStr.replaceAll('-', '')}.csv`, companiesToCsvRows(sorted));
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">企業一覧</h1>
          <p className="text-sm text-slate-500">
            {visible.length} 件表示 / 全 {companies.length} 件
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
            辞退/不通過も表示 ({closedCount})
          </label>
          <Link
            href="/import"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            CSVインポート
          </Link>
          <button
            onClick={handleExport}
            disabled={companies.length === 0}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            CSVエクスポート
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            ＋ 企業を追加
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={load} className="ml-3 underline">
            再読み込み
          </button>
        </div>
      )}

      {loading ? (
        <p className="py-12 text-center text-slate-500">読み込み中...</p>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center text-slate-500">
          企業が登録されていません。「＋ 企業を追加」から登録してください。
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">会社名</th>
                <th className="px-4 py-3">エージェント</th>
                <th className="px-4 py-3">選考フェーズ</th>
                <th className="px-4 py-3">アクション</th>
                <th className="px-4 py-3">次回アクション日</th>
                <th className="px-4 py-3">更新日時</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((c) => {
                const overdue = c.nextActionDate !== '' && c.nextActionDate < todayStr && c.action !== '辞退/不通過';
                const isToday = c.nextActionDate === todayStr;
                return (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/companies/${c.id}`)}
                    className={`cursor-pointer hover:bg-blue-50/50 ${c.action === '辞退/不通過' ? 'opacity-60' : ''}`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link href={`/companies/${c.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                        {c.companyName}
                      </Link>
                      {isActionRequired(c.action) && (
                        <span className="ml-2 inline-block h-2 w-2 rounded-full bg-red-500" title="要対応" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.agent || '-'}</td>
                    <td className="px-4 py-3">
                      <PhaseBadge phase={c.phase} />
                    </td>
                    <td className="px-4 py-3">
                      <ActionBadge action={c.action} />
                    </td>
                    <td
                      className={`px-4 py-3 tabular-nums ${
                        overdue ? 'font-semibold text-red-600' : isToday ? 'font-semibold text-amber-600' : 'text-slate-700'
                      }`}
                    >
                      {c.nextActionDate || '-'}
                      {c.nextActionDate && c.nextActionTime && <span className="ml-1">{c.nextActionTime}</span>}
                      {overdue && <span className="ml-1 text-xs">(期限切れ)</span>}
                      {isToday && <span className="ml-1 text-xs">(今日)</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-500">
                      {new Date(c.updatedAt).toLocaleString('ja-JP')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} title="企業を追加" onClose={() => setModalOpen(false)}>
        <CompanyForm submitLabel="登録する" onSubmit={handleCreate} onCancel={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
