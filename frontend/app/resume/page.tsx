'use client';

import {
  type Resume,
  type ResumeContent,
  resumeBlocks,
  resumeToMarkdown,
  resumeToPlainText,
  todayLocalDate,
} from '@jobdash/shared';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import CopyButton from '@/components/ui/CopyButton';
import { errorBox, primaryButton, secondaryButton, sectionClass } from '@/components/ui/styles';
import { useResume, useSaveResume } from '@/features/resume/api';
import ResumeDocument from '@/features/resume/components/ResumeDocument';
import ResumeEditor from '@/features/resume/components/ResumeEditor';
import { resumeToDocx } from '@/features/resume/lib/toDocx';
import { errorMessage } from '@/lib/apiClient';

const contentOf = ({ version: _v, updatedAt: _u, ...content }: Resume): ResumeContent => content;

function download(filename: string, data: Blob | string, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(typeof data === 'string' ? new Blob([data], { type }) : data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ResumePage() {
  return (
    <Suspense fallback={<p className="py-12 text-center text-slate-500">読み込み中...</p>}>
      <ResumeLoader />
    </Suspense>
  );
}

function ResumeLoader() {
  const { data: saved, isPending, error } = useResume();
  if (isPending) return <p className="py-12 text-center text-slate-500">読み込み中...</p>;
  if (!saved) return <div className={errorBox}>{errorMessage(error, '取得に失敗しました')}</div>;
  return <ResumeScreen saved={saved} />;
}

function ResumeScreen({ saved }: { saved: Resume }) {
  const save = useSaveResume();
  const [draft, setDraft] = useState<ResumeContent>(() => contentOf(saved));
  const initialTab = useSearchParams().get('tab') === 'preview' ? 'preview' : 'edit';
  const [tab, setTab] = useState<'edit' | 'preview'>(initialTab);
  const dirty = JSON.stringify(draft) !== JSON.stringify(contentOf(saved));

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const today = todayLocalDate();
  const blocks = useMemo(() => resumeBlocks(draft, today), [draft, today]);
  const plainText = useMemo(() => resumeToPlainText(draft, today), [draft, today]);
  const markdown = useMemo(() => resumeToMarkdown(draft, today), [draft, today]);
  const baseName = `職務経歴書_${draft.fullName.replace(/\s/g, '') || '未入力'}_${today.replaceAll('-', '')}`;

  const handleWord = async () => download(`${baseName}.docx`, await resumeToDocx(blocks));
  const handlePdf = () => {
    setTab('preview');
    // Let the preview render before opening the print dialog
    setTimeout(() => window.print(), 100);
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">職務経歴書</h1>
          <p className="text-sm text-slate-500">
            {saved.version > 0
              ? `最終保存: ${new Date(saved.updatedAt).toLocaleString('ja-JP')}`
              : 'まだ保存されていません'}
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {(
            [
              ['edit', '編集'],
              ['preview', 'プレビュー・出力'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-md px-4 py-2 text-sm font-medium ${tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'edit' ? (
        <ResumeEditor value={draft} update={(fn) => setDraft(fn)} />
      ) : (
        <>
          <section className={`${sectionClass} space-y-3 print:hidden`}>
            <p className="text-sm text-slate-600">
              面接対策メモは出力されません。
              {dirty && <span className="ml-1 text-amber-700">未保存の編集内容で出力します。</span>}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-24 text-sm font-medium text-slate-700">テキスト</span>
              <CopyButton text={plainText} label="コピー" />
              <button type="button" onClick={() => download(`${baseName}.txt`, plainText)} className={secondaryButton}>
                .txt をダウンロード
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-24 text-sm font-medium text-slate-700">Markdown</span>
              <CopyButton text={markdown} label="コピー" />
              <button
                type="button"
                onClick={() => download(`${baseName}.md`, markdown, 'text/markdown;charset=utf-8')}
                className={secondaryButton}
              >
                .md をダウンロード
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-24 text-sm font-medium text-slate-700">Word / PDF</span>
              <button type="button" onClick={handleWord} className={secondaryButton}>
                Word（.docx）をダウンロード
              </button>
              <button type="button" onClick={handlePdf} className={secondaryButton}>
                PDF（印刷画面を開く）
              </button>
              <span className="text-xs text-slate-500">印刷画面で「PDFに保存」を選んでください。</span>
            </div>
          </section>
          <div className="rounded-lg bg-slate-200 p-4 print:bg-white print:p-0">
            <ResumeDocument blocks={blocks} />
          </div>
        </>
      )}

      {/* Save bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-3 px-4 py-3">
          {save.error && (
            <span className="mr-auto text-sm text-red-700">{errorMessage(save.error, '保存に失敗しました')}</span>
          )}
          {dirty ? (
            <>
              <span className="text-xs text-amber-600">未保存の変更があります</span>
              <button
                type="button"
                onClick={() =>
                  window.confirm('編集内容を破棄して、保存済みの内容に戻しますか？') && setDraft(contentOf(saved))
                }
                disabled={save.isPending}
                className="text-sm text-slate-500 hover:underline"
              >
                変更を破棄
              </button>
            </>
          ) : (
            <span className="text-xs text-slate-400">保存済み</span>
          )}
          <button
            type="button"
            onClick={() => save.mutate({ content: draft, version: saved.version })}
            disabled={!dirty || save.isPending}
            className={primaryButton}
          >
            {save.isPending ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
