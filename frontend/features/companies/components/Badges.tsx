import type { ActionStatus, SelectionPhase } from '@jobdash/shared';

const PHASE_STYLES: Record<SelectionPhase, string> = {
  書類選考: 'bg-slate-100 text-slate-700 ring-slate-300',
  '試験/課題': 'bg-sky-50 text-sky-700 ring-sky-200',
  一次面接: 'bg-blue-50 text-blue-700 ring-blue-200',
  二次面接: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  最終面接: 'bg-violet-50 text-violet-700 ring-violet-200',
  'オファー/内定': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

const ACTION_STYLES: Record<ActionStatus, string> = {
  要日程調整: 'bg-amber-50 text-amber-800 ring-amber-300',
  要本番準備: 'bg-orange-50 text-orange-800 ring-orange-300',
  要対応: 'bg-red-50 text-red-700 ring-red-300',
  日程調整待ち: 'bg-slate-50 text-slate-600 ring-slate-200',
  選考結果待ち: 'bg-slate-50 text-slate-600 ring-slate-200',
  辞退: 'bg-zinc-100 text-zinc-500 ring-zinc-300',
  不通過: 'bg-zinc-100 text-zinc-500 ring-zinc-300 line-through',
};

const base =
  'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset';

export function PhaseBadge({ phase }: { phase: SelectionPhase }) {
  return <span className={`${base} ${PHASE_STYLES[phase] ?? ''}`}>{phase}</span>;
}

export function ActionBadge({ action }: { action: ActionStatus }) {
  return <span className={`${base} ${ACTION_STYLES[action] ?? ''}`}>{action}</span>;
}
