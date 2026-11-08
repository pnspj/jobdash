'use client';

import { useMemo } from 'react';
import { groupByAgent, maxPhaseTotal, phaseCounts, selectionSummary, type PhaseCount } from '@jobdash/shared';
import { errorMessage } from '@/lib/apiClient';
import { usePersistentState } from '@/lib/usePersistentState';
import { errorBox, sectionClass } from '@/components/ui/styles';
import { agentDisplayName, useAgentLookup } from '@/features/agents/api';
import { useCompanies } from '@/features/companies/api';
import PhaseChart, { CHART_COLORS } from '@/features/stats/components/PhaseChart';

const collator = new Intl.Collator('ja');

function StatTile({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-3xl font-semibold text-slate-900">{value}</p>
      {note && <p className="text-xs text-slate-400">{note}</p>}
    </div>
  );
}

function Legend({ includeRejected }: { includeRejected: boolean }) {
  if (!includeRejected) return null; // a single series is named by the chart title
  return (
    <div className="flex gap-4 text-xs text-slate-600">
      {(
        [
          ['選考中', CHART_COLORS.active],
          ['不採用（不通過）', CHART_COLORS.rejected],
        ] as const
      ).map(([label, color]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

function CountsTable({ rows, includeRejected }: { rows: { name: string; counts: PhaseCount[] }[]; includeRejected: boolean }) {
  const phases = rows[0]?.counts.map((c) => c.phase) ?? [];
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-left text-xs text-slate-500">
          <tr>
            <th className="py-1 pr-4">対象</th>
            {phases.map((p) => (
              <th key={p} className="px-2 py-1 text-right">
                {p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 tabular-nums">
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="py-1 pr-4">{r.name}</td>
              {r.counts.map((c) => (
                <td key={c.phase} className="px-2 py-1 text-right">
                  {c.active}
                  {includeRejected && c.rejected > 0 && <span className="text-slate-400">（+{c.rejected}）</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {includeRejected && <p className="mt-1 text-xs text-slate-400">（+N）は不採用の件数</p>}
    </div>
  );
}

/** Selection phase statistics: overall and per agent, with rejected companies optional. */
export default function StatsPage() {
  const { data: companies = [], isPending, error } = useCompanies();
  const { get: getAgent } = useAgentLookup();
  const [settings, setSettings] = usePersistentState('jobdash.statsSettings', { includeRejected: false });
  const { includeRejected } = settings;

  const summary = useMemo(() => selectionSummary(companies), [companies]);
  const overall = useMemo(() => phaseCounts(companies, { includeRejected }), [companies, includeRejected]);
  const perAgent = useMemo(() => {
    return [...groupByAgent(companies).entries()]
      .map(([agentId, list]) => {
        const agent = getAgent(agentId || undefined);
        return {
          key: agentId || 'direct',
          name: agentId ? (agent ? agentDisplayName(agent) : '（不明なエージェント）') : '直接応募',
          sortKey: agentId ? (agent?.shortName ?? '￿') : '￿￿', // direct application last
          counts: phaseCounts(list, { includeRejected }),
        };
      })
      .filter((g) => g.counts.some((c) => c.active + c.rejected > 0))
      .sort((a, b) => collator.compare(a.sortKey, b.sortKey));
  }, [companies, getAgent, includeRejected]);
  const sharedMax = maxPhaseTotal(perAgent.map((g) => g.counts));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">集計</h1>
          <p className="text-sm text-slate-500">選考フェーズ別の企業数です。辞退した企業は集計に含めません。</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={includeRejected}
            onChange={(e) => setSettings({ includeRejected: e.target.checked })}
          />
          不採用（不通過）を含める
        </label>
      </div>

      {error && <div className={errorBox}>{errorMessage(error, '取得に失敗しました')}</div>}
      {isPending ? (
        <p className="py-12 text-center text-slate-500">読み込み中...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <StatTile label="選考中" value={summary.active} note={`全${summary.total}社中`} />
            <StatTile label="面接・試験中" value={summary.interviewing} />
            <StatTile label="内定" value={summary.offers} />
            <StatTile label="不採用" value={summary.rejected} />
            <StatTile label="辞退" value={summary.declined} />
          </div>

          <section className={sectionClass}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">選考フェーズ（全体）</h2>
              <Legend includeRejected={includeRejected} />
            </div>
            <PhaseChart data={overall} includeRejected={includeRejected} maxY={maxPhaseTotal([overall])} />
          </section>

          <section className={sectionClass}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">選考フェーズ（エージェント別）</h2>
                <p className="text-xs text-slate-500">比較しやすいよう、縦軸の目盛りをすべて揃えています。</p>
              </div>
              <Legend includeRejected={includeRejected} />
            </div>
            {perAgent.length === 0 ? (
              <p className="text-sm text-slate-500">対象の企業がありません。</p>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {perAgent.map((g) => (
                  <div key={g.key}>
                    <h3 className="mb-1 text-sm font-medium text-slate-700">
                      {g.name}
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        {g.counts.reduce((n, c) => n + c.active + c.rejected, 0)}社
                      </span>
                    </h3>
                    <PhaseChart data={g.counts} includeRejected={includeRejected} maxY={sharedMax} height={200} compact />
                  </div>
                ))}
              </div>
            )}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-blue-600">表で表示</summary>
              <div className="mt-2">
                <CountsTable
                  includeRejected={includeRejected}
                  rows={[{ name: '全体', counts: overall }, ...perAgent.map((g) => ({ name: g.name, counts: g.counts }))]}
                />
              </div>
            </details>
          </section>
        </>
      )}
    </div>
  );
}
