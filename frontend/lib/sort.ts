import { ACTION_STATUSES, SELECTION_PHASES, type CompanyRecord } from './types';

const collator = new Intl.Collator('ja');

/** Compare next action date-time ascending; records without a date go last, untimed after timed on the same day. */
function compareNextAction(a: CompanyRecord, b: CompanyRecord): number {
  if (!a.nextActionDate || !b.nextActionDate) {
    return Number(!a.nextActionDate) - Number(!b.nextActionDate);
  }
  return (
    a.nextActionDate.localeCompare(b.nextActionDate) ||
    (a.nextActionTime || '99:99').localeCompare(b.nextActionTime || '99:99')
  );
}

/**
 * Default list order:
 * 1. next action date-time (soonest first)
 * 2. action, in ACTION_STATUSES order
 * 3. phase, in reverse SELECTION_PHASES order (later stages first)
 * 4. agent ascending
 * 5. company name ascending
 */
export function compareCompanies(a: CompanyRecord, b: CompanyRecord): number {
  return (
    compareNextAction(a, b) ||
    ACTION_STATUSES.indexOf(a.action) - ACTION_STATUSES.indexOf(b.action) ||
    SELECTION_PHASES.indexOf(b.phase) - SELECTION_PHASES.indexOf(a.phase) ||
    collator.compare(a.agent, b.agent) ||
    collator.compare(a.companyName, b.companyName)
  );
}

export const formatNextAction = (c: Pick<CompanyRecord, 'nextActionDate' | 'nextActionTime'>) =>
  c.nextActionDate ? `${c.nextActionDate}${c.nextActionTime ? ` ${c.nextActionTime}` : ''}` : '';
