/**
 * Plain-text reports for agent communication (see docs/design.md 4.2).
 * Pure functions: callers filter companies (e.g. by agent) and pass "today".
 */
import type { Company } from './company';
import { isClosedAction, SELECTION_PHASES, type SelectionPhase } from './enums';
import { formatRating, RATINGS, researchOf, splitLines } from './research';
import { formatSlot } from './schedule';
import { companyComparator } from './sort';

type ReportCompany = Pick<
  Company,
  'id' | 'companyName' | 'phase' | 'action' | 'nextActionAt' | 'agentId' | 'research' | 'interviews'
>;

// Within a group, companies follow the default list order (agent names are irrelevant here)
const byListOrder = companyComparator(() => '');

/** Which optional parts of a company label to output. Both default to on. */
export interface LabelOptions {
  /** "（SI）": the first tag */
  tag?: boolean;
  /** "面接2回": the interview count from the research, when known */
  interviewCount?: boolean;
}

/** "A社（SI）面接2回": first tag in parentheses, interview count when known. */
export function companyLabel(
  c: Pick<Company, 'companyName' | 'research'>,
  { tag = true, interviewCount = true }: LabelOptions = {},
): string {
  const r = researchOf(c);
  const tagText = tag && r.tags[0] ? `（${r.tags[0]}）` : '';
  const countText = interviewCount && r.interviewCount ? `面接${r.interviewCount}回` : '';
  return `${c.companyName}${tagText}${countText}`;
}

// ---------- interview schedule ----------

export interface InterviewScheduleOptions extends LabelOptions {
  /** "一次面接": the stage of the interview (off by default) */
  stage?: boolean;
}

/**
 * Upcoming interviews (start date >= today) of open companies, soonest first:
 *   11/4（水）16:00 A社（SI）面接2回
 *   11/4（水）16:00 一次面接 A社（SI）面接2回   (stage: true)
 */
export function interviewScheduleText(
  companies: ReportCompany[],
  today: string,
  { stage = false, ...label }: InterviewScheduleOptions = {},
): string {
  return companies
    .filter((c) => !isClosedAction(c.action))
    .flatMap((c) => (c.interviews ?? []).filter((i) => i.start.slice(0, 10) >= today).map((i) => ({ c, i })))
    .sort((a, b) => a.i.start.localeCompare(b.i.start))
    .map(({ c, i }) =>
      [formatSlot(i, '{月}/{日}（{曜}）{開始}'), stage && i.stage, companyLabel(c, label)].filter(Boolean).join(' '),
    )
    .join('\n');
}

// ---------- selection status ----------

export interface SelectionStatusOptions extends LabelOptions {
  /** Also output "◇辞退 N社" (counts only). */
  includeDeclined?: boolean;
}

type StatusGroup =
  | { kind: 'offer' }
  | { kind: 'result'; phase: SelectionPhase } // waiting for the result of `phase`
  | { kind: 'waiting'; phase: SelectionPhase } // waiting for `phase` to take place
  | { kind: 'rejected'; phase: SelectionPhase }
  | { kind: 'declined' };

/** Which heading a company belongs to; undefined = not reported (document screening). */
export function statusGroupOf(c: Pick<Company, 'phase' | 'action'>): StatusGroup | undefined {
  if (c.phase === '書類選考') return undefined;
  if (c.action === '不通過') return { kind: 'rejected', phase: c.phase };
  if (c.action === '辞退') return { kind: 'declined' };
  if (c.phase === 'オファー/内定') return { kind: 'offer' };
  if (c.action === '選考結果待ち') return { kind: 'result', phase: c.phase };
  return { kind: 'waiting', phase: c.phase };
}

const groupKey = (g: StatusGroup) => ('phase' in g ? `${g.kind}:${g.phase}` : g.kind);

/** Headings order: offer, then later phases first ("result" before "waiting"), then rejected (later first), then declined. */
function groupRank(g: StatusGroup): number {
  const phaseRank = 'phase' in g ? SELECTION_PHASES.length - SELECTION_PHASES.indexOf(g.phase) : 0;
  switch (g.kind) {
    case 'offer':
      return 0;
    case 'result':
      return 100 + phaseRank * 2;
    case 'waiting':
      return 100 + phaseRank * 2 + 1;
    case 'rejected':
      return 1000 + phaseRank;
    case 'declined':
      return 2000;
  }
}

function heading(g: StatusGroup, count: number): string {
  switch (g.kind) {
    case 'offer':
      return '◇内定';
    case 'result':
      return `◇${g.phase}結果待ち`;
    case 'waiting':
      return `◇${g.phase}待ち`;
    case 'rejected':
      return `◇${g.phase}不採用 ${count}社`;
    case 'declined':
      return `◇辞退 ${count}社`;
  }
}

/**
 * Selection status grouped by heading. Document screening is excluded; rejected (and declined) are counts only.
 *   ◇内定
 *   C社（受託開発）面接1回
 *
 *   ◇一次面接不採用 2社
 */
export function selectionStatusText(companies: ReportCompany[], options: SelectionStatusOptions = {}): string {
  const groups = new Map<string, { group: StatusGroup; companies: ReportCompany[] }>();
  for (const c of [...companies].sort(byListOrder)) {
    const group = statusGroupOf(c);
    if (!group || (group.kind === 'declined' && !options.includeDeclined)) continue;
    const entry = groups.get(groupKey(group)) ?? { group, companies: [] };
    entry.companies.push(c);
    groups.set(groupKey(group), entry);
  }
  return [...groups.values()]
    .sort((a, b) => groupRank(a.group) - groupRank(b.group))
    .map(({ group, companies: list }) => {
      const countOnly = group.kind === 'rejected' || group.kind === 'declined';
      return [heading(group, list.length), ...(countOnly ? [] : list.map((c) => companyLabel(c, options)))].join('\n');
    })
    .join('\n\n');
}

// ---------- motivation (志望度) ----------

/**
 * Companies by rating (highest first), excluding document screening, closed and unrated companies:
 *   志望度★★★
 *   ◇A社
 *   魅力的な点
 *   ・サービスが先進的
 *   不安な点
 *   ・残業が多そう
 */
export function motivationText(companies: ReportCompany[]): string {
  const eligible = [...companies].filter((c) => c.phase !== '書類選考' && !isClosedAction(c.action)).sort(byListOrder);
  return [...RATINGS]
    .reverse()
    .map((rating) => {
      const rated = eligible.filter((c) => researchOf(c).rating === rating);
      if (rated.length === 0) return '';
      const blocks = rated.map((c) => {
        const r = researchOf(c);
        const section = (title: string, text: string) => {
          const lines = splitLines(text);
          return lines.length > 0 ? [title, ...lines.map((l) => `・${l}`)] : [];
        };
        return [`◇${c.companyName}`, ...section('魅力的な点', r.attractions), ...section('不安な点', r.concerns)].join(
          '\n',
        );
      });
      return [`志望度${formatRating(rating)}`, ...blocks].join('\n');
    })
    .filter((s) => s !== '')
    .join('\n\n');
}

/** Companies that motivationText leaves out only because they have no rating. */
export const unratedForMotivation = (companies: ReportCompany[]) =>
  companies.filter((c) => c.phase !== '書類選考' && !isClosedAction(c.action) && !researchOf(c).rating);
