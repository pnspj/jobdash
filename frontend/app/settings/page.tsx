'use client';

import { sampleBackup } from '@jobdash/shared/sample';
import { type ChangeEvent, useState } from 'react';
import { dangerButton, inputClass, primaryButton, secondaryButton, sectionClass } from '@/components/ui/styles';
import { backupApi, useDeleteAllData, useRestoreBackup } from '@/features/backup/api';
import { errorMessage } from '@/lib/apiClient';

const DELETE_CONFIRM_WORD = '削除';

function downloadJson(filename: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const Success = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{children}</p>
);
const Failure = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{children}</p>
);

export default function SettingsPage() {
  const restore = useRestoreBackup();
  const deleteAll = useDeleteAllData();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [restoreSource, setRestoreSource] = useState<'file' | 'sample' | null>(null);
  const [confirmWord, setConfirmWord] = useState('');

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
    setRestoreSource('file');
    restore.mutate(data);
  };

  const handleLoadSample = () => {
    if (!window.confirm('現在のデータをすべて削除し、サンプルデータで置き換えます。よろしいですか？')) return;
    setRestoreSource('sample');
    restore.mutate(sampleBackup());
  };

  const handleDeleteAll = () => {
    deleteAll.mutate(undefined, { onSuccess: () => setConfirmWord('') });
  };

  const restoredMessage = restore.data
    ? `${restoreSource === 'sample' ? 'サンプルデータを読み込みました' : '復元しました'}（企業 ${restore.data.restored.companies ?? 0} 件、エージェント ${restore.data.restored.agents ?? 0} 件）。`
    : '';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">データ管理</h1>

      <section className={sectionClass}>
        <h2 className="mb-1 text-lg font-semibold">バックアップ</h2>
        <p className="mb-4 text-sm text-slate-500">全データをJSONファイルとしてダウンロードします。</p>
        <button type="button" onClick={handleExport} disabled={exporting} className={primaryButton}>
          {exporting ? '取得中...' : 'バックアップをダウンロード'}
        </button>
        {exportError && <Failure>{exportError}</Failure>}
      </section>

      <section className={sectionClass}>
        <h2 className="mb-1 text-lg font-semibold">復元</h2>
        <p className="mb-4 text-sm text-slate-500">
          バックアップのJSONファイルから復元します。
          <strong className="text-red-600">現在のデータはすべて置き換えられます。</strong>
        </p>
        <input
          type="file"
          accept="application/json,.json"
          onChange={handleRestore}
          disabled={restore.isPending}
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-red-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-red-700 hover:file:bg-red-100"
        />
        {restore.isPending && restoreSource === 'file' && <p className="mt-3 text-sm text-slate-500">復元中...</p>}
        {restore.isSuccess && restoreSource === 'file' && <Success>{restoredMessage}</Success>}
        {restore.error && restoreSource === 'file' && (
          <Failure>{errorMessage(restore.error, '復元に失敗しました')}</Failure>
        )}
      </section>

      <section className={sectionClass}>
        <h2 className="mb-1 text-lg font-semibold">サンプルデータ</h2>
        <p className="mb-4 text-sm text-slate-500">
          架空の企業30社・エージェント3件のサンプルを読み込みます。今後の面接や次回アクションが未来の日付になるよう、日付は週単位で調整されます。
          <strong className="text-red-600">現在のデータはすべて置き換えられます。</strong>
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleLoadSample} disabled={restore.isPending} className={secondaryButton}>
            {restore.isPending && restoreSource === 'sample' ? '読み込み中...' : 'サンプルデータを読み込む'}
          </button>
          <button
            type="button"
            onClick={() => downloadJson('jobdash-sample.json', sampleBackup())}
            className={secondaryButton}
          >
            サンプルJSONをダウンロード
          </button>
        </div>
        {restore.isSuccess && restoreSource === 'sample' && <Success>{restoredMessage}</Success>}
        {restore.error && restoreSource === 'sample' && (
          <Failure>{errorMessage(restore.error, '読み込みに失敗しました')}</Failure>
        )}
      </section>

      <section className="rounded-lg border border-red-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-red-700">全データの削除</h2>
        <p className="mb-4 text-sm text-slate-600">
          企業・エージェントを含むすべてのデータを削除します。元に戻せないため、先に
          <button type="button" onClick={handleExport} disabled={exporting} className="mx-1 text-blue-600 underline">
            バックアップをダウンロード
          </button>
          しておくことをおすすめします。
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-slate-600" htmlFor="delete-confirm">
            確認のため「{DELETE_CONFIRM_WORD}」と入力:
          </label>
          <input
            id="delete-confirm"
            value={confirmWord}
            onChange={(e) => setConfirmWord(e.target.value)}
            className={`${inputClass} w-28`}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={handleDeleteAll}
            disabled={confirmWord.trim() !== DELETE_CONFIRM_WORD || deleteAll.isPending}
            className={dangerButton}
          >
            {deleteAll.isPending ? '削除中...' : 'すべて削除'}
          </button>
        </div>
        {deleteAll.isSuccess && (
          <Success>
            削除しました（企業 {deleteAll.data.deleted.companies ?? 0} 件、エージェント{' '}
            {deleteAll.data.deleted.agents ?? 0} 件）。
          </Success>
        )}
        {deleteAll.error && <Failure>{errorMessage(deleteAll.error, '削除に失敗しました')}</Failure>}
      </section>
    </div>
  );
}
