import {
  ACTION_STATUSES,
  SELECTION_PHASES,
  type ActionStatus,
  joinLocalDateTime,
  splitLocalDateTime,
  EMPTY_RESEARCH,
  MAX_INTERVIEW_COUNT,
  normalizeShortName,
  parseRating,
  parseTags,
  researchOf,
  type Agent,
  type Research,
  type Company,
  type CompanyImportRecordParsed,
  type SelectionPhase,
} from '@jobdash/shared';

// ---------- target fields ----------

export type TargetField =
  | 'companyName'
  | 'companyUrl'
  | 'agent'
  | 'agentJobUrl'
  | 'phase'
  | 'action'
  | 'nextActionDate'
  | 'nextActionTime'
  | 'details'
  | ResearchTextField
  | 'tags'
  | 'interviewCount'
  | 'rating';

type ResearchTextField = 'motivation' | 'futureVision' | 'reverseQuestions' | 'attractions' | 'concerns';
const RESEARCH_TEXT_FIELDS: ResearchTextField[] = ['motivation', 'futureVision', 'reverseQuestions', 'attractions', 'concerns'];

export const TARGET_FIELDS: { key: TargetField; label: string; required?: boolean; hint?: string }[] = [
  { key: 'companyName', label: '会社名', required: true },
  { key: 'companyUrl', label: '会社URL' },
  { key: 'agent', label: '担当エージェント' },
  { key: 'agentJobUrl', label: 'エージェント求人URL' },
  { key: 'phase', label: '選考フェーズ', hint: '値の対応付けが必要' },
  { key: 'action', label: 'アクション', hint: '値の対応付けが必要' },
  { key: 'nextActionDate', label: '次回アクション日時', hint: '日付または日時の列（時刻も取り込みます）' },
  { key: 'nextActionTime', label: '次回アクション時刻', hint: '日付列とは別に時刻列がある場合' },
  { key: 'details', label: '詳細' },
  { key: 'tags', label: 'タグ', hint: 'カンマ・読点・スラッシュ区切りで複数可。先頭が代表タグ' },
  { key: 'interviewCount', label: '面接回数', hint: '数値' },
  { key: 'rating', label: '総合評価（志望度）', hint: '1〜3 または ★' },
  { key: 'motivation', label: '志望理由' },
  { key: 'futureVision', label: '入社後の将来像' },
  { key: 'reverseQuestions', label: '逆質問' },
  { key: 'attractions', label: '魅力的な点' },
  { key: 'concerns', label: '不安な点' },
];

/** Column header labels used by export (and recognized on import for round-tripping). */
export const EXPORT_HEADERS: Record<TargetField, string> = {
  companyName: '会社名',
  companyUrl: '会社URL',
  agent: '担当エージェント',
  agentJobUrl: 'エージェント求人URL',
  phase: '選考フェーズ',
  action: 'アクション',
  nextActionDate: '次回アクション日',
  nextActionTime: '次回アクション時刻',
  details: '詳細',
  tags: 'タグ',
  interviewCount: '面接回数',
  rating: '総合評価',
  motivation: '志望理由',
  futureVision: '入社後の将来像',
  reverseQuestions: '逆質問',
  attractions: '魅力的な点',
  concerns: '不安な点',
};

/** Column mapping: target field -> CSV column index (null = not imported). */
export type ColumnMapping = Record<TargetField, number | null>;

// ---------- normalization ----------

/** Normalize for fuzzy comparison: NFKC, lowercase, drop whitespace and separators. */
export const normalizeKey = (s: string) =>
  s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s_\-・/／]/g, '');

const HEADER_ALIASES: Record<TargetField, string[]> = {
  companyName: ['会社名', '企業名', '会社', '企業', 'company', 'companyname', 'name', '名前'],
  companyUrl: ['会社url', '企業url', '会社hp', '企業hp', 'companyurl', 'hp', 'website', 'ホームページ'],
  agent: ['担当エージェント', 'エージェント', 'agent', '経由', '媒体'],
  agentJobUrl: ['エージェント求人url', '求人url', 'url', 'agentjoburl', 'joburl', 'link', 'リンク'],
  phase: ['選考フェーズ', 'フェーズ', '選考状況', 'ステータス', 'phase', 'status'],
  action: ['アクション', '次のアクション', 'action', 'todo'],
  nextActionDate: ['次回アクション日時', '次回アクション日', '次回アクション', '日付', '日程', '期限', 'date', 'nextactiondate', 'due'],
  nextActionTime: ['次回アクション時刻', '時刻', '時間', 'time', 'nextactiontime'],
  details: ['詳細', 'メモ', '備考', 'note', 'notes', 'details', 'memo', 'comment'],
  tags: ['タグ', 'tags', 'tag', '業態', '種別', 'カテゴリ', 'category'],
  interviewCount: ['面接回数', '面接数', 'interviewcount', 'interviews'],
  rating: ['総合評価', '志望度', '評価', 'rating'],
  motivation: ['志望理由', '志望動機', 'motivation'],
  futureVision: ['入社後の将来像', '将来像', 'futurevision'],
  reverseQuestions: ['逆質問', 'reversequestions'],
  attractions: ['魅力的な点', '魅力', '良い点', 'attractions'],
  concerns: ['不安な点', '懸念', '懸念点', '気になる点', 'concerns'],
};

/** Guess the column mapping from CSV headers (exact alias match, first match wins). */
export function guessMapping(headers: string[]): ColumnMapping {
  const normalized = headers.map(normalizeKey);
  const used = new Set<number>();
  const mapping = {} as ColumnMapping;
  for (const { key } of TARGET_FIELDS) {
    mapping[key] = null;
    for (const alias of HEADER_ALIASES[key]) {
      const idx = normalized.findIndex((h, i) => !used.has(i) && h === normalizeKey(alias));
      if (idx !== -1) {
        mapping[key] = idx;
        used.add(idx);
        break;
      }
    }
  }
  return mapping;
}

/** Guess which enum value a raw CSV value refers to (normalized exact match, then containment). */
export function guessEnumValue<T extends string>(raw: string, options: readonly T[]): T | null {
  const key = normalizeKey(raw);
  if (key === '') return null;
  const exact = options.find((o) => normalizeKey(o) === key);
  if (exact) return exact;
  const partial = options.filter((o) => normalizeKey(o).includes(key) || key.includes(normalizeKey(o)));
  return partial.length === 1 ? partial[0] : null;
}

// ---------- date / time parsing ----------

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const pad = (n: number) => String(n).padStart(2, '0');

function buildTime(h: number, m: number, ampm?: string): string | undefined {
  let hour = h;
  if (ampm) {
    const pm = ampm.toLowerCase() === 'pm';
    if (hour === 12) hour = pm ? 12 : 0;
    else if (pm) hour += 12;
  }
  if (hour > 23 || m > 59) return undefined;
  return `${pad(hour)}:${pad(m)}`;
}

function isValidDate(y: number, m: number, d: number) {
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export type ParsedDateTime = { date: string; time?: string } | { error: string } | null;

/**
 * Parse a date (optionally with time) into YYYY-MM-DD / HH:mm.
 * Supports Notion export ("November 9, 2026 15:00 (GMT+9)", ranges with "→"),
 * ISO-like ("2026-11-09", "2026/11/9 15:00", "2026-11-09T15:00") and Japanese ("2026年11月9日 15:00").
 * Timezone suffixes are ignored: values are treated as local wall-clock time.
 * Returns null for empty input.
 */
export function parseDateTime(raw: string): ParsedDateTime {
  let s = raw.normalize('NFKC').trim();
  if (s === '') return null;
  s = s.split('→')[0].trim(); // keep the start of a range
  s = s.replace(/\((GMT|UTC)[^)]*\)/i, '').trim();

  const timePart = String.raw`(?:[ T]+(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?\s*(am|pm)?)?`;

  // YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD / YYYY年M月D日
  let m = s.match(new RegExp(String.raw`^(\d{4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})\s*日?` + timePart, 'i'));
  if (m) {
    const [, y, mo, d, h, mi, ap] = m;
    return finish(+y, +mo, +d, h, mi, ap, raw);
  }

  // "November 9, 2026 15:00" / "Nov 9 2026 3:00 PM"
  m = s.match(new RegExp(String.raw`^([a-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})` + timePart.replace('[ T]+', String.raw`[ T,]+`), 'i'));
  if (m) {
    const [, mon, d, y, h, mi, ap] = m;
    const month = MONTHS[mon.slice(0, 3).toLowerCase()];
    if (!month) return { error: `月名を解釈できません: ${raw}` };
    return finish(+y, month, +d, h, mi, ap, raw);
  }

  return { error: `日付を解釈できません: ${raw}` };
}

function finish(y: number, mo: number, d: number, h: string | undefined, mi: string | undefined, ap: string | undefined, raw: string): ParsedDateTime {
  if (!isValidDate(y, mo, d)) return { error: `存在しない日付です: ${raw}` };
  const date = `${y}-${pad(mo)}-${pad(d)}`;
  if (h === undefined || mi === undefined) return { date };
  const time = buildTime(+h, +mi, ap);
  return time ? { date, time } : { error: `時刻を解釈できません: ${raw}` };
}

/** Parse a standalone time column ("15:00", "3:00 PM"). */
export function parseTime(raw: string): string | undefined | { error: string } {
  const s = raw.normalize('NFKC').trim();
  if (s === '') return undefined;
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i);
  const time = m ? buildTime(+m[1], +m[2], m[3]) : undefined;
  return time ?? { error: `時刻を解釈できません: ${raw}` };
}

// ---------- row conversion ----------

export interface ValueMappings {
  phase: Record<string, SelectionPhase>; // raw (trimmed) CSV value -> phase
  action: Record<string, ActionStatus>;
  agent: Record<string, AgentChoice>; // raw agent label -> how to link it
}

/** How a raw CSV agent label is linked: an existing agent id, a new agent, or no agent. */
export type AgentChoice = string;
export const NEW_AGENT: AgentChoice = '__new__';
export const NO_AGENT: AgentChoice = '__none__';

/**
 * Default agent choice per raw label: an existing agent whose short name or name matches
 * (case/width-insensitive), otherwise create a new agent. `overrides` (user choices) win.
 */
export function autoMapAgents(
  raws: string[],
  agents: Pick<Agent, 'id' | 'name' | 'shortName'>[],
  overrides: Record<string, AgentChoice> = {},
): Record<string, AgentChoice> {
  return Object.fromEntries(
    raws.map((raw) => {
      if (overrides[raw]) return [raw, overrides[raw]];
      const key = normalizeShortName(raw);
      const match =
        agents.find((a) => normalizeShortName(a.shortName) === key) ?? agents.find((a) => normalizeShortName(a.name) === key);
      return [raw, match ? match.id : NEW_AGENT];
    }),
  );
}

export interface ImportDefaults {
  phase: SelectionPhase; // used when the phase column is not mapped or empty
  action: ActionStatus;
}

export interface ConvertedRow {
  rowNumber: number; // 1-based line number in the CSV data (excluding header)
  input: CompanyImportRecordParsed;
  errors: string[];
}

const cell = (row: string[], idx: number | null) => (idx === null ? '' : (row[idx] ?? '').trim());

export function convertRow(
  row: string[],
  rowNumber: number,
  mapping: ColumnMapping,
  values: ValueMappings,
  defaults: ImportDefaults,
): ConvertedRow {
  const errors: string[] = [];

  const companyName = cell(row, mapping.companyName);
  if (!companyName) errors.push('会社名が空です');

  const rawPhase = cell(row, mapping.phase);
  const phase = rawPhase ? values.phase[rawPhase] : defaults.phase;
  if (!phase) errors.push(`選考フェーズ「${rawPhase}」の対応先が未設定です`);

  const rawAction = cell(row, mapping.action);
  const action = rawAction ? values.action[rawAction] : defaults.action;
  if (!action) errors.push(`アクション「${rawAction}」の対応先が未設定です`);

  let nextActionDate = '';
  let nextActionTime: string | undefined;
  const parsed = parseDateTime(cell(row, mapping.nextActionDate));
  if (parsed && 'error' in parsed) errors.push(parsed.error);
  else if (parsed) {
    nextActionDate = parsed.date;
    nextActionTime = parsed.time;
  }
  const timeCell = cell(row, mapping.nextActionTime);
  if (timeCell) {
    const t = parseTime(timeCell);
    if (typeof t === 'object') errors.push(t.error);
    else nextActionTime = t;
  }

  const research = convertResearch(row, mapping, errors);

  const rawAgent = cell(row, mapping.agent);
  const choice = rawAgent ? (values.agent[rawAgent] ?? NEW_AGENT) : NO_AGENT;
  const agentLink =
    choice === NO_AGENT ? {} : choice === NEW_AGENT ? { agentShortName: rawAgent } : { agentId: choice };

  return {
    rowNumber,
    errors,
    input: {
      companyName,
      companyUrl: cell(row, mapping.companyUrl) || undefined,
      ...agentLink,
      agentJobUrl: cell(row, mapping.agentJobUrl) || undefined,
      phase: phase ?? defaults.phase,
      action: action ?? defaults.action,
      nextActionAt: joinLocalDateTime(nextActionDate, nextActionTime ?? ''),
      details: mapping.details === null ? '' : (row[mapping.details] ?? ''),
      ...(research && { research }),
    },
  };
}

const RESEARCH_FIELDS: TargetField[] = [...RESEARCH_TEXT_FIELDS, 'tags', 'interviewCount', 'rating'];

/** Research from the mapped columns; undefined when no research column is mapped. */
function convertResearch(row: string[], mapping: ColumnMapping, errors: string[]): Research | undefined {
  if (RESEARCH_FIELDS.every((f) => mapping[f] === null)) return undefined;
  const research: Research = { ...EMPTY_RESEARCH, tags: parseTags(cell(row, mapping.tags)) };
  for (const f of RESEARCH_TEXT_FIELDS) research[f] = mapping[f] === null ? '' : (row[mapping[f]] ?? '').trim();

  const rawCount = cell(row, mapping.interviewCount).normalize('NFKC').replace(/回$/, '');
  if (rawCount) {
    const n = Number(rawCount);
    if (Number.isInteger(n) && n >= 1 && n <= MAX_INTERVIEW_COUNT) research.interviewCount = n;
    else errors.push(`面接回数を解釈できません: ${rawCount}`);
  }
  const rating = parseRating(cell(row, mapping.rating));
  if (rating === null) errors.push(`総合評価は1〜3で指定してください: ${cell(row, mapping.rating)}`);
  else if (rating) research.rating = rating;
  return research;
}

/** Distinct non-empty trimmed values of a column, in first-seen order. */
export function distinctValues(rows: string[][], idx: number | null): string[] {
  if (idx === null) return [];
  return [...new Set(rows.map((r) => (r[idx] ?? '').trim()).filter((v) => v !== ''))];
}

export const autoMapEnum = <T extends string>(raws: string[], options: readonly T[], prev: Record<string, T> = {}) =>
  Object.fromEntries(
    raws.flatMap((raw) => {
      const v = prev[raw] ?? guessEnumValue(raw, options);
      return v ? [[raw, v]] : [];
    }),
  ) as Record<string, T>;

export { ACTION_STATUSES, SELECTION_PHASES };

/** CSV column values of a company for each target field (next action split into date and time). */
function exportValues(c: Company, agentShortName: (id: string | undefined) => string): Record<TargetField, string> {
  const { date, time } = splitLocalDateTime(c.nextActionAt);
  const research = researchOf(c);
  return {
    companyName: c.companyName,
    companyUrl: c.companyUrl ?? '',
    agent: agentShortName(c.agentId),
    agentJobUrl: c.agentJobUrl ?? '',
    phase: c.phase,
    action: c.action,
    nextActionDate: date,
    nextActionTime: time,
    details: c.details,
    tags: research.tags.join(', '),
    interviewCount: research.interviewCount?.toString() ?? '',
    rating: research.rating?.toString() ?? '',
    motivation: research.motivation,
    futureVision: research.futureVision,
    reverseQuestions: research.reverseQuestions,
    attractions: research.attractions,
    concerns: research.concerns,
  };
}

// ---------- export ----------

export function companiesToCsvRows(companies: Company[], agentShortName: (id: string | undefined) => string): string[][] {
  const fields = TARGET_FIELDS.map((f) => f.key);
  const header = [...fields.map((f) => EXPORT_HEADERS[f]), '更新日時', 'ID'];
  const body = companies.map((c) => {
    const values = exportValues(c, agentShortName);
    return [...fields.map((f) => values[f]), c.updatedAt, c.id];
  });
  return [header, ...body];
}
