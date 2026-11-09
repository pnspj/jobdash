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
import { PAGE_ICONS } from '@/components/layout/nav';
import PageTitle from '@/components/layout/PageTitle';
import CopyButton from '@/components/ui/CopyButton';
import { errorBox, inputBaseClass, inputClass, sectionClass } from '@/components/ui/styles';
import { agentDisplayName, useAgents } from '@/features/agents/api';
import { useCompanies } from '@/features/companies/api';
import { errorMessage } from '@/lib/apiClient';
import { usePersistentState } from '@/lib/usePersistentState';

const ALL = '__all__';
const DIRECT = '__direct__';

interface ReportSettings {
  agentFilter: string; // ALL | DIRECT | agent id
  includeDeclined: boolean;
  schedule: { stage: boolean; tag: boolean; interviewCount: boolean; honorific: boolean };
  status: { tag: boolean; interviewCount: boolean; honorific: boolean };
  motivation: { tag: boolean; interviewCount: boolean; status: boolean; honorific: boolean };
}

const DEFAULT_SETTINGS: ReportSettings = {
  agentFilter: ALL,
  includeDeclined: false,
  schedule: { stage: false, tag: true, interviewCount: true, honorific: false },
  status: { tag: true, interviewCount: true, honorific: false },
  motivation: { tag: false, interviewCount: false, status: false, honorific: false },
};

/** Settings saved by an older version may lack newer keys: fill them from the defaults. */
const withDefaults = (s: ReportSettings): ReportSettings => ({
  ...s,
  schedule: { ...DEFAULT_SETTINGS.schedule, ...s.schedule },
  status: { ...DEFAULT_SETTINGS.status, ...s.status },
  motivation: { ...DEFAULT_SETTINGS.motivation, ...s.motivation },
});

/** A row of checkboxes switching parts of the output on and off. */
function Toggles<K extends string>({
  value,
  labels,
  onChange,
}: {
  value: Record<K, boolean>;
  labels: [K, string][];
  onChange: (value: Record<K, boolean>) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
      {labels.map(([key, label]) => (
        <label key={key} className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={value[key]}
            onChange={(e) => onChange({ ...value, [key]: e.target.checked })}
          />
          {label}
        </label>
      ))}
    </div>
  );
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
  const [stored, setSettings] = usePersistentState<ReportSettings>('jobdash.reportSettings', DEFAULT_SETTINGS);
  const settings = withDefaults(stored);

  const filtered = useMemo<Company[]>(() => {
    if (settings.agentFilter === ALL) return companies;
    if (settings.agentFilter === DIRECT) return companies.filter((c) => !c.agentId);
    return companies.filter((c) => c.agentId === settings.agentFilter);
  }, [companies, settings.agentFilter]);

  const today = todayLocalDate();
  const schedule = interviewScheduleText(filtered, today, settings.schedule);
  const status = selectionStatusText(filtered, { includeDeclined: settings.includeDeclined, ...settings.status });
  const motivation = motivationText(filtered, settings.motivation);
  const unrated = unratedForMotivation(filtered);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageTitle icon={PAGE_ICONS.reports}>連絡用テキスト</PageTitle>
          <p className="text-sm text-slate-500">エージェントへの連絡にそのまま貼り付けられるテキストです。</p>
        </div>
        <label className="flex items-center gap-2 whitespace-nowrap text-sm text-slate-600">
          対象
          <select
            value={settings.agentFilter}
            onChange={(e) => setSettings((s) => ({ ...s, agentFilter: e.target.value }))}
            className={`${inputBaseClass} w-auto`}
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
            description="今日以降の面接日時（辞退・不通過の企業を除く）と、日程調整中（要日程調整・日程調整待ち）の企業。（）には先頭のタグ、企業研究の面接回数、面接の選考段階を出せます。チェックで出力する項目を切り替えられます。"
            text={schedule}
            empty="今日以降の面接予定・日程調整中の企業はありません"
          >
            <Toggles
              value={settings.schedule}
              labels={[
                ['tag', 'タグ'],
                ['interviewCount', '面接回数'],
                ['stage', '選考段階（一次面接など）'],
                ['honorific', '企業名に「様」を付ける'],
              ]}
              onChange={(schedule) => setSettings((s) => ({ ...s, schedule }))}
            />
          </ReportBlock>

          <ReportBlock
            title="選考状況"
            description="書類選考中の企業を除きます。不採用は件数のみ出力します。"
            text={status}
            empty="出力対象の企業がありません"
          >
            <Toggles
              value={{ ...settings.status, declined: settings.includeDeclined }}
              labels={[
                ['tag', 'タグ'],
                ['interviewCount', '面接回数'],
                ['honorific', '企業名に「様」を付ける'],
                ['declined', '辞退した企業の件数'],
              ]}
              onChange={({ declined, ...status }) => setSettings((s) => ({ ...s, includeDeclined: declined, status }))}
            />
          </ReportBlock>

          <ReportBlock
            title="志望度"
            description="書類選考中・辞退・不通過の企業を除き、総合評価（★）の高い順に出力します。"
            text={motivation}
            empty="総合評価が入力された企業がありません"
          >
            <Toggles
              value={settings.motivation}
              labels={[
                ['tag', 'タグ'],
                ['interviewCount', '面接回数'],
                ['status', '選考状況（一次面接待ちなど）'],
                ['honorific', '企業名に「様」を付ける'],
              ]}
              onChange={(motivation) => setSettings((s) => ({ ...s, motivation }))}
            />
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
