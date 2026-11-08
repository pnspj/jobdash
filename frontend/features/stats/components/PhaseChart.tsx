'use client';

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts';
import type { PhaseCount, SelectionPhase } from '@jobdash/shared';

/**
 * Chart tokens (light mode only; the app has no dark theme).
 * Emphasis form: in-progress companies in blue, rejected ones as gray context.
 * Validated with the dataviz palette checker against #ffffff: CVD ΔE 15.9, normal ΔE 17.8, contrast >= 3:1.
 */
export const CHART_COLORS = { active: '#2a78d6', rejected: '#898781' } as const;
const INK = { primary: '#0b0b0b', secondary: '#52514e', muted: '#898781', grid: '#e1e0d9', axis: '#c3c2b7' } as const;
const SURFACE = '#ffffff';

const SHORT_LABELS: Record<SelectionPhase, string> = {
  書類選考: '書類',
  '試験/課題': '試験',
  一次面接: '一次',
  二次面接: '二次',
  最終面接: '最終',
  'オファー/内定': '内定',
};

type Row = PhaseCount & { total: number };

/** Round the axis maximum up to a "nice" value and return evenly spaced integer ticks. */
export function niceTicks(max: number): number[] {
  const step = max <= 5 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : max <= 50 ? 10 : Math.ceil(max / 50) * 10;
  const top = Math.max(step, Math.ceil(max / step) * step);
  return Array.from({ length: top / step + 1 }, (_, i) => i * step);
}

function PhaseTooltip({ active, payload }: TooltipContentProps<number, string>) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as Row;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold text-slate-900">{row.phase}</p>
      <p className="flex items-center gap-2 text-slate-700">
        <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS.active }} />
        選考中 <span className="ml-auto tabular-nums font-medium">{row.active}社</span>
      </p>
      {payload.some((p) => p.dataKey === 'rejected') && (
        <p className="flex items-center gap-2 text-slate-700">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS.rejected }} />
          不採用 <span className="ml-auto tabular-nums font-medium">{row.rejected}社</span>
        </p>
      )}
    </div>
  );
}

interface Props {
  data: PhaseCount[];
  includeRejected: boolean;
  /** Shared y-axis maximum (small multiples must use the same scale). */
  maxY: number;
  height?: number;
  compact?: boolean;
}

/** Column chart of companies per selection phase; rejected companies stack on top in gray. */
export default function PhaseChart({ data, includeRejected, maxY, height = 280, compact = false }: Props) {
  const rows: Row[] = data.map((d) => ({ ...d, total: d.active + d.rejected }));
  const top = includeRejected ? 'rejected' : 'active';
  const axisTick = { fill: INK.muted, fontSize: compact ? 11 : 12 };
  const ticks = niceTicks(maxY);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 20, right: 8, bottom: 0, left: -16 }} barCategoryGap={compact ? '28%' : '36%'}>
        <CartesianGrid vertical={false} stroke={INK.grid} />
        <XAxis
          dataKey="phase"
          tickFormatter={(p: SelectionPhase) => (compact ? SHORT_LABELS[p] : p)}
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: INK.axis }}
          interval={0}
        />
        <YAxis
          allowDecimals={false}
          domain={[0, ticks[ticks.length - 1]]}
          ticks={ticks}
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip content={PhaseTooltip} cursor={{ fill: 'rgba(11,11,11,0.04)' }} />
        <Bar
          dataKey="active"
          stackId="phase"
          fill={CHART_COLORS.active}
          // 2px surface gap between stacked segments and neighbors
          stroke={SURFACE}
          strokeWidth={2}
          radius={top === 'active' ? [4, 4, 0, 0] : 0}
          isAnimationActive={false}
        >
          {!includeRejected && <LabelList dataKey="total" position="top" fill={INK.secondary} fontSize={12} formatter={(v) => (v ? v : '')} />}
        </Bar>
        {includeRejected && (
          <Bar
            dataKey="rejected"
            stackId="phase"
            fill={CHART_COLORS.rejected}
            stroke={SURFACE}
            strokeWidth={2}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          >
            <LabelList dataKey="total" position="top" fill={INK.secondary} fontSize={12} formatter={(v) => (v ? v : '')} />
          </Bar>
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
