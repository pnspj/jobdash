import type { Company } from './company';
import { SELECTION_PHASES, isClosedAction, type SelectionPhase } from './enums';

export interface PhaseCount {
  phase: SelectionPhase;
  /** Companies still in progress at this phase. */
  active: number;
  /** Companies rejected (不通過) at this phase; 0 unless includeRejected. Declined companies are never counted. */
  rejected: number;
}

type StatCompany = Pick<Company, 'phase' | 'action' | 'agentId'>;

/** Count per selection phase, in SELECTION_PHASES order (all phases, including zero rows). */
export function phaseCounts(companies: StatCompany[], { includeRejected = false } = {}): PhaseCount[] {
  return SELECTION_PHASES.map((phase) => {
    const atPhase = companies.filter((c) => c.phase === phase);
    return {
      phase,
      active: atPhase.filter((c) => !isClosedAction(c.action)).length,
      rejected: includeRejected ? atPhase.filter((c) => c.action === '不通過').length : 0,
    };
  });
}

export interface SelectionSummary {
  total: number;
  active: number; // not declined / rejected
  offers: number; // active at オファー/内定
  interviewing: number; // active beyond document screening, before offer
  rejected: number;
  declined: number;
}

export function selectionSummary(companies: StatCompany[]): SelectionSummary {
  const active = companies.filter((c) => !isClosedAction(c.action));
  return {
    total: companies.length,
    active: active.length,
    offers: active.filter((c) => c.phase === 'オファー/内定').length,
    interviewing: active.filter((c) => c.phase !== '書類選考' && c.phase !== 'オファー/内定').length,
    rejected: companies.filter((c) => c.action === '不通過').length,
    declined: companies.filter((c) => c.action === '辞退').length,
  };
}

/** Group companies by agentId ('' = direct application). */
export function groupByAgent<T extends StatCompany>(companies: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const c of companies) {
    const key = c.agentId ?? '';
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  return groups;
}

/** Largest stacked total across the given counts (for a shared y-axis). */
export const maxPhaseTotal = (counts: PhaseCount[][]) =>
  Math.max(0, ...counts.flat().map((c) => c.active + c.rejected));
