/**
 * Resume outputs (plain text / Markdown) and a neutral document model used by Word/PDF renderers.
 * Interview notes (面接対策メモ) are never included.
 */
import type { Career, Period, Project, ResumeContent } from './resume';

const ym = (s: string) => {
  const [y, m] = s.split('-').map(Number);
  return { y, m };
};

/** "2020年4月" */
export const formatYearMonth = (s: string) => `${ym(s).y}年${ym(s).m}月`;

/** Months in a period, counting both ends ("2020-04"–"2021-03" = 12). Ongoing periods count up to `currentYearMonth`. */
export function periodMonths(p: Period, currentYearMonth: string): number {
  const a = ym(p.from);
  const b = ym(p.to ?? currentYearMonth);
  return Math.max(0, (b.y - a.y) * 12 + (b.m - a.m) + 1);
}

/** "3年6か月" / "8か月" */
export function formatDuration(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  return y === 0 ? `${m}か月` : m === 0 ? `${y}年` : `${y}年${m}か月`;
}

/** "2020年4月～2021年3月" / "2023年10月～現在", optionally with the duration. */
export function formatPeriod(p: Period, opts: { currentYearMonth?: string } = {}): string {
  const range = `${formatYearMonth(p.from)}～${p.to ? formatYearMonth(p.to) : '現在'}`;
  return opts.currentYearMonth ? `${range}（${formatDuration(periodMonths(p, opts.currentYearMonth))}）` : range;
}

/** "2026年11月8日現在" */
export function formatAsOf(today: string): string {
  const [y, m, d] = today.split('-').map(Number);
  return `${y}年${m}月${d}日現在`;
}

// ---------- neutral document model ----------

export type ResumeBlock =
  | { type: 'title'; text: string }
  | { type: 'meta'; text: string } // right-aligned line (date, name)
  | { type: 'heading'; text: string } // section: 職務要約, 職務経歴, ...
  | { type: 'company'; name: string; period: string; details: string } // career header
  | { type: 'project'; name: string; period: string; fields: { label: string; value: string }[] }
  | { type: 'paragraph'; text: string };

const PROJECT_FIELDS: {
  key: keyof Pick<Project, 'overview' | 'responsibilities' | 'environment' | 'team'>;
  label: string;
}[] = [
  { key: 'overview', label: 'プロジェクト概要' },
  { key: 'responsibilities', label: '担当業務' },
  { key: 'environment', label: '言語・環境' },
  { key: 'team', label: 'チーム構成' },
];

const companyDetails = (c: Career) =>
  [c.employees && `従業員数: ${c.employees}`, c.employmentType && `雇用形態: ${c.employmentType}`]
    .filter(Boolean)
    .join(' / ');

/** The resume as an ordered list of blocks. Empty sections are omitted. */
export function resumeBlocks(r: ResumeContent, today: string): ResumeBlock[] {
  const current = today.slice(0, 7);
  const blocks: ResumeBlock[] = [
    { type: 'title', text: '職務経歴書' },
    { type: 'meta', text: formatAsOf(today) },
  ];
  if (r.fullName.trim()) blocks.push({ type: 'meta', text: `氏名 ${r.fullName.trim()}` });

  const section = (heading: string, body: string) => {
    if (body.trim()) blocks.push({ type: 'heading', text: heading }, { type: 'paragraph', text: body.trim() });
  };

  section('職務要約', r.summary);

  if (r.careers.length > 0) {
    blocks.push({ type: 'heading', text: '職務経歴' });
    for (const c of r.careers) {
      blocks.push({
        type: 'company',
        name: c.companyName,
        period: formatPeriod(c.period, { currentYearMonth: current }),
        details: companyDetails(c),
      });
      for (const p of c.projects) {
        blocks.push({
          type: 'project',
          name: p.name.trim() || '（プロジェクト名未入力）',
          period: formatPeriod(p.period, { currentYearMonth: current }),
          fields: PROJECT_FIELDS.filter((f) => p[f.key].trim()).map((f) => ({
            label: f.label,
            value: p[f.key].trim(),
          })),
        });
      }
    }
  }

  section('活かせる経験・知識・技術', r.skills);
  section('自己PR', r.selfPr);
  return blocks;
}

// ---------- text formats ----------

/** Plain text, e.g. for pasting into a web form. */
export function resumeToPlainText(r: ResumeContent, today: string): string {
  const out: string[] = [];
  for (const b of resumeBlocks(r, today)) {
    switch (b.type) {
      case 'title':
        out.push(b.text);
        break;
      case 'meta':
        out.push(b.text);
        break;
      case 'heading':
        out.push('', `■${b.text}`);
        break;
      case 'company':
        out.push('', `◆${b.name}（${b.period}）`, ...(b.details ? [b.details] : []));
        break;
      case 'project':
        out.push('', `【${b.name}】${b.period}`, ...b.fields.flatMap((f) => [`＜${f.label}＞`, f.value]));
        break;
      case 'paragraph':
        out.push(b.text);
        break;
    }
  }
  return `${out.join('\n')}\n`;
}

/** Markdown. Line breaks inside values are kept with trailing double spaces. */
export function resumeToMarkdown(r: ResumeContent, today: string): string {
  const md = (s: string) => s.split('\n').join('  \n');
  const out: string[] = [];
  for (const b of resumeBlocks(r, today)) {
    switch (b.type) {
      case 'title':
        out.push(`# ${b.text}`, '');
        break;
      case 'meta':
        out.push(`${b.text}  `);
        break;
      case 'heading':
        out.push('', `## ${b.text}`, '');
        break;
      case 'company':
        out.push('', `### ${b.name}（${b.period}）`, '', ...(b.details ? [b.details, ''] : []));
        break;
      case 'project':
        out.push(
          `#### ${b.name}`,
          '',
          `期間: ${b.period}`,
          '',
          ...b.fields.flatMap((f) => [`**${f.label}**  `, md(f.value), '']),
        );
        break;
      case 'paragraph':
        out.push(md(b.text));
        break;
    }
  }
  return `${out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()}\n`;
}
