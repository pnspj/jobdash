'use client';

import { useState, type ChangeEvent } from 'react';
import { errorMessage } from '@/lib/apiClient';
import { backupApi, useRestoreBackup } from '@/features/backup/api';

const sectionClass = 'rounded-lg border border-slate-200 bg-white p-6 shadow-sm';

function downloadJson(filename: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SettingsPage() {
  const restore = useRestoreBackup();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const backup = await backupApi.export();
      const stamp = backup.exportedAt.slice(0, 19).replace(/[-:]/g, '').replace('T', '-');
      downloadJson(`jobdash-backup-${stamp}.json`, backup);
    } catch (err) {
      setExportError(errorMessage(err, 'バックアップの取得に失敗しました'));
    } finally {
      setExporting(false);
    }
  };

  const handleRestore = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      window.alert('JSONとして読み込めませんでした。');
      return;
    }
    if (!window.confirm('現在のデータをすべて削除し、バックアップの内容で置き換えます。よろしいですか？')) return;
    restore.mutate(data);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">データ管理</h1>

      <section className={sectionClass}>
        <h2 className="mb-1 text-lg font-semibold">バックアップ</h2>
        <p className="mb-4 text-sm text-slate-500">全データをJSONファイルとしてダウンロードします。</p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {exporting ? '取得中...' : 'バックアップをダウンロード'}
        </button>
        {exportError && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{exportError}</p>}
      </section>

      <section className={sectionClass}>
        <h2 className="mb-1 text-lg font-semibold">復元</h2>
        <p className="mb-4 text-sm text-slate-500">
          バックアップのJSONファイルから復元します。<strong className="text-red-600">現在のデータはすべて置き換えられます。</strong>
        </p>
        <input
          type="file"
          accept="application/json,.json"
          onChange={handleRestore}
          disabled={restore.isPending}
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-red-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-red-700 hover:file:bg-red-100"
        />
        {restore.isPending && <p className="mt-3 text-sm text-slate-500">復元中...</p>}
        {restore.isSuccess && (
          <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            復元しました（企業 {restore.data.restored.companies ?? 0} 件）。
          </p>
        )}
        {restore.error && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage(restore.error, '復元に失敗しました')}
          </p>
        )}
      </section>
    </div>
  );
}
