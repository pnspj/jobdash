'use client';

import {
  type Company,
  interviewScheduleText,
  motivationText,
  selectionStatusText,
  todayLocalDate,
  unratedForMotivation,
} from '@jobdash/shared';
import { useMemo } from 'react';
import CopyButton from '@/components/ui/CopyButton';
import { errorBox, inputClass, sectionClass } from '@/components/ui/styles';
import { agentDisplayName, useAgents } from '@/features/agents/api';
import { useCompanies } from '@/features/companies/api';
import { errorMessage } from '@/lib/apiClient';
import { usePersistentState } from '@/lib/usePersistentState';

const ALL = '__all__';
const DIRECT = '__direct__';

interface ReportSettings {
  agentFilter: string; // ALL | DIRECT | agent id
  includeDeclined: boolean;
}

function ReportBlock({
  title,
  description,
  text,
  empty,
  children,
}: {
  title: string;
  description: string;
  text: string;
  empty: string;
  children?: React.ReactNode;
}) {
  const lines = text === '' ? 0 : text.split('\n').length;
  return (
    <section className={sectionClass}>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <CopyButton text={text} />
      </div>
      {children}
      <textarea
        readOnly
        value={text}
        placeholder={empty}
        rows={Math.min(Math.max(lines, 3), 24)}
        className={`${inputClass} mt-2 font-mono text-sm`}
      />
    </section>
  );
}

/** Plain-text reports for agent communication: interview schedule, selection status, motivation. */
export default function ReportsPage() {
  const { data: companies = [], isPending, error } = useCompanies();
  const { data: agents = [] } = useAgents();
  const [settings, setSettings] = usePersistentState<ReportSettings>('jobdash.reportSettings', {
    agentFilter: ALL,
    includeDeclined: false,
  });

  const filtered = useMemo<Company[]>(() => {
    if (settings.agentFilter === ALL) return companies;
    if (settings.agentFilter === DIRECT) return companies.filter((c) => !c.agentId);
    return companies.filter((c) => c.agentId === settings.agentFilter);
  }, [companies, settings.agentFilter]);

  const today = todayLocalDate();
  const schedule = interviewScheduleText(filtered, today);
  const status = selectionStatusText(filtered, { includeDeclined: settings.includeDeclined });
  const motivation = motivationText(filtered);
  const unrated = unratedForMotivation(filtered);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">連絡用テキスト</h1>
          <p className="text-sm text-slate-500">エージェントへの連絡にそのまま貼り付けられるテキストです。</p>
        </div>
        <label className="flex items-center gap-2 whitespace-nowrap text-sm text-slate-600">
          対象
          <select
            value={settings.agentFilter}
            onChange={(e) => setSettings((s) => ({ ...s, agentFilter: e.target.value }))}
            className={`${inputClass} w-auto`}
          >
            <option value={ALL}>すべての企業</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {agentDisplayName(a)}経由のみ
              </option>
            ))}
            <option value={DIRECT}>直接応募のみ</option>
          </select>
        </label>
      </div>

      {error && <div className={errorBox}>{errorMessage(error, '取得に失敗しました')}</div>}
      {isPending ? (
        <p className="py-12 text-center text-slate-500">読み込み中...</p>
      ) : (
        <>
          <ReportBlock
            title="面接予定"
            description="今日以降の面接日時（辞退・不通過の企業を除く）。（）は先頭のタグ、「面接N回」は会社研究の面接回数です。"
            text={schedule}
            empty="今日以降の面接予定はありません"
          />

          <ReportBlock
            title="選考状況"
            description="書類選考中の企業を除きます。不採用は件数のみ出力します。"
            text={status}
            empty="出力対象の企業がありません"
          >
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={settings.includeDeclined}
                onChange={(e) => setSettings((s) => ({ ...s, includeDeclined: e.target.checked }))}
              />
              辞退した企業の件数も出力する
            </label>
          </ReportBlock>

          <ReportBlock
            title="志望度"
            description="書類選考中・辞退・不通過の企業を除き、総合評価（★）の高い順に出力します。"
            text={motivation}
            empty="総合評価が入力された企業がありません"
          >
            {unrated.length > 0 && (
              <p className="text-xs text-amber-700">
                総合評価が未入力のため出力されていない企業: {unrated.map((c) => c.companyName).join('、')}
              </p>
            )}
          </ReportBlock>
        </>
      )}
    </div>
  );
}
