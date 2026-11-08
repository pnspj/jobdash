import { z } from 'zod';

export const RATINGS = [1, 2, 3] as const;
export type Rating = (typeof RATINGS)[number];

export const MAX_TAGS = 20;
export const MAX_INTERVIEW_COUNT = 20;

const text = z.string().default('');

/** Trim, drop empties and duplicates (keeping the first occurrence, so the first tag stays first). */
const tagsSchema = z
  .array(z.string())
  .transform((tags) => [...new Set(tags.map((t) => t.trim()).filter((t) => t !== ''))])
  .pipe(z.array(z.string()).max(MAX_TAGS, `タグは${MAX_TAGS}個までです`));

const interviewCountSchema = z.number().int().min(1).max(MAX_INTERVIEW_COUNT);
const ratingSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

/** Company research ("企業研究"). Stored as `company.research`. */
export const researchSchema = z.object({
  motivation: text, // 志望理由
  futureVision: text, // 入社後の将来像
  reverseQuestions: text, // 逆質問
  attractions: text, // 魅力的な点 (one item per line)
  concerns: text, // 不安な点 (one item per line)
  tags: tagsSchema.default([]), // free tags; the first one is used in reports, e.g. "A社（SI）"
  interviewCount: interviewCountSchema.optional(), // 面接回数, entered from the job posting
  rating: ratingSchema.optional(), // 総合評価 = 志望度
});

/**
 * Partial update of research: given keys replace the stored values, absent keys are kept.
 * `interviewCount` / `rating` are cleared with null.
 */
export const researchPatchSchema = z.object({
  motivation: z.string().optional(),
  futureVision: z.string().optional(),
  reverseQuestions: z.string().optional(),
  attractions: z.string().optional(),
  concerns: z.string().optional(),
  tags: tagsSchema.optional(),
  interviewCount: interviewCountSchema.nullable().optional(),
  rating: ratingSchema.nullable().optional(),
});

export type Research = z.output<typeof researchSchema>;
export type ResearchInput = z.input<typeof researchSchema>;
export type ResearchPatch = z.input<typeof researchPatchSchema>;
export type ResearchPatchParsed = z.output<typeof researchPatchSchema>;

export const EMPTY_RESEARCH: Research = {
  motivation: '',
  futureVision: '',
  reverseQuestions: '',
  attractions: '',
  concerns: '',
  tags: [],
};

/** Research of a company with defaults for companies that have none yet. */
export const researchOf = (c: { research?: Research }): Research => ({ ...EMPTY_RESEARCH, ...c.research });

/** Merge a research patch into the current research; null clears optional numbers. */
export function mergeResearch(current: Research | undefined, patch: ResearchPatchParsed): Research {
  const next: Record<string, unknown> = { ...EMPTY_RESEARCH, ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (value === null) delete next[key];
    else next[key] = value;
  }
  return next as Research;
}

/** Non-empty trimmed lines, e.g. for "魅力的な点" bullet lists. */
export const splitLines = (s: string) =>
  s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '');

export const formatRating = (rating: Rating | undefined) => (rating ? '★'.repeat(rating) : '');

/** Parse "1"-"3" or "★★" style values; returns undefined when empty, null when invalid. */
export function parseRating(raw: string): Rating | undefined | null {
  const s = raw.normalize('NFKC').trim();
  if (s === '') return undefined;
  const stars = s.match(/^[★☆*]+$/) ? [...s].filter((c) => c === '★' || c === '*').length : Number(s);
  return RATINGS.includes(stars as Rating) ? (stars as Rating) : null;
}

/** Split a tag cell like "自社サービス, SaaS / BtoB" into tags. */
export const parseTags = (raw: string) =>
  raw
    .normalize('NFKC')
    .split(/[,、/／;；|]/)
    .map((t) => t.trim())
    .filter((t) => t !== '');
