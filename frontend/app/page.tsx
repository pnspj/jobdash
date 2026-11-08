'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { compareCompanies, isClosedAction, todayLocalDate } from '@jobdash/shared';
import { errorMessage } from '@/lib/apiClient';
import Modal from '@/components/ui/Modal';
import { useCompanies, useCreateCompany } from '@/features/companies/api';
import CompanyForm from '@/features/companies/components/CompanyForm';
import CompanyTable from '@/features/companies/components/CompanyTable';
import { downloadCsv } from '@/features/import/lib/csv';
import { companiesToCsvRows } from '@/features/import/lib/csvMapping';

const secondaryButton =
  'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50';

export default function CompanyListPage() {
  const { data: companies = [], isPending, error, refetch } = useCompanies();
  const create = useCreateCompany();
  const [showClosed, setShowClosed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const sorted = useMemo(() => [...companies].sort(compareCompanies), [companies]);
  const visible = showClosed ? sorted : sorted.filter((c) => !isClosedAction(c.action));
  const closedCount = companies.length - sorted.filter((c) => !isClosedAction(c.action)).length;

  const handleExport = () =>
    downloadCsv(`jobdash-${todayLocalDate().replaceAll('-', '')}.csv`, companiesToCsvRows(sorted));

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
            辞退・不通過も表示 ({closedCount})
          </label>
          <Link href="/import" className={secondaryButton}>
            CSVインポート
          </Link>
          <button onClick={handleExport} disabled={companies.length === 0} className={secondaryButton}>
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
          {errorMessage(error, '一覧の取得に失敗しました')}
          <button onClick={() => refetch()} className="ml-3 underline">
            再読み込み
          </button>
        </div>
      )}

      {isPending ? (
        <p className="py-12 text-center text-slate-500">読み込み中...</p>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center text-slate-500">
          企業が登録されていません。「＋ 企業を追加」から登録してください。
        </div>
      ) : (
        <CompanyTable companies={visible} />
      )}

      <Modal open={modalOpen} title="企業を追加" onClose={() => setModalOpen(false)}>
        <CompanyForm
          submitLabel="登録する"
          onSubmit={async (input) => {
            await create.mutateAsync(input);
            setModalOpen(false);
          }}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
