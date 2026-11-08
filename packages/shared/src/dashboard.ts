/**
 * Dashboard rows: "what needs doing now", merged from three sources and ordered by next action.
 * See docs/design.md 4.3.
 */
import type { Company } from './company';
import { type ActionStatus, isClosedAction, type SelectionPhase } from './enums';
import type { Todo } from './todo';

interface RowBase {
  id: string;
  /** Company name or to-do title */
  title: string;
  agentId?: string;
  nextActionAt?: string;
}

export type DashboardRow =
  | (RowBase & { kind: 'company'; phase: SelectionPhase; action: ActionStatus })
  | (RowBase & { kind: 'agentTodo'; todo: Todo })
  | (RowBase & { kind: 'todo'; todo: Todo });

const KIND_ORDER: Record<DashboardRow['kind'], number> = { company: 0, agentTodo: 1, todo: 2 };

/** Date-only values sort after timed ones on the same day; undated rows go last. */
const sortKey = (at: string | undefined) => (at ? (at.length === 10 ? `${at}T99:99` : at) : '9999');

export function compareDashboardRows(a: DashboardRow, b: DashboardRow): number {
  return (
    sortKey(a.nextActionAt).localeCompare(sortKey(b.nextActionAt)) ||
    KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
    a.title.localeCompare(b.title, 'ja')
  );
}

/**
 * - companies: with a next action, excluding declined / rejected ones
 * - agent to-dos and dashboard to-dos: open ones (undated ones at the end)
 */
export function dashboardRows(companies: Company[], todos: Todo[]): DashboardRow[] {
  const rows: DashboardRow[] = [
    ...companies
      .filter((c) => c.nextActionAt && !isClosedAction(c.action))
      .map((c) => ({
        kind: 'company' as const,
        id: c.id,
        title: c.companyName,
        agentId: c.agentId,
        nextActionAt: c.nextActionAt,
        phase: c.phase,
        action: c.action,
      })),
    ...todos
      .filter((t) => t.status === 'open')
      .map((t) => ({
        kind: t.agentId ? ('agentTodo' as const) : ('todo' as const),
        id: t.id,
        title: t.title,
        agentId: t.agentId,
        nextActionAt: t.nextActionAt,
        todo: t,
      })),
  ];
  return rows.sort(compareDashboardRows);
}

/** The tutorial is offered only to a brand-new user: no companies, agents or to-dos at all. */
export const isEmptyWorkspace = (counts: { companies: number; agents: number; todos: number }) =>
  counts.companies === 0 && counts.agents === 0 && counts.todos === 0;
