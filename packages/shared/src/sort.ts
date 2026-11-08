import type { Company } from './company';
import { ACTION_STATUSES, SELECTION_PHASES } from './enums';

const collator = new Intl.Collator('ja');

/** Soonest first; date-only values sort after timed values on the same day; empty last. */
function compareNextAction(a: string | undefined, b: string | undefined): number {
  if (!a || !b) return Number(!a) - Number(!b);
  // "YYYY-MM-DD" vs "YYYY-MM-DDTHH:mm": pad date-only to the end of the day
  return (a.length === 10 ? `${a}T99:99` : a).localeCompare(b.length === 10 ? `${b}T99:99` : b);
}

export type SortableCompany = Pick<Company, 'nextActionAt' | 'action' | 'phase' | 'agentId' | 'companyName'>;

/**
 * Default company order:
 * 1. next action date-time (soonest first)
 * 2. action, in ACTION_STATUSES order
 * 3. phase, in reverse SELECTION_PHASES order (later stages first)
 * 4. agent ascending (by the name `agentName` returns)
 * 5. company name ascending
 *
 * `agentName` resolves an agentId to the name used for ordering (e.g. short name).
 */
export function companyComparator(agentName: (agentId: string | undefined) => string) {
  return (a: SortableCompany, b: SortableCompany): number =>
    compareNextAction(a.nextActionAt, b.nextActionAt) ||
    ACTION_STATUSES.indexOf(a.action) - ACTION_STATUSES.indexOf(b.action) ||
    SELECTION_PHASES.indexOf(b.phase) - SELECTION_PHASES.indexOf(a.phase) ||
    collator.compare(agentName(a.agentId), agentName(b.agentId)) ||
    collator.compare(a.companyName, b.companyName);
}
