import { z } from 'zod';

/** "YYYY-MM" */
export const YEAR_MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const yearMonth = z.string().regex(YEAR_MONTH_RE, 'YYYY-MM 形式で指定してください');

/** Period of employment / a project. `to` omitted = ongoing ("現在"). */
export const periodSchema = z
  .object({ from: yearMonth, to: yearMonth.optional() })
  .refine((p) => !p.to || p.to >= p.from, { message: '終了は開始以降にしてください', path: ['to'] });

const text = z.string().default('');

export const projectSchema = z.object({
  name: text, // プロジェクト名
  period: periodSchema,
  overview: text, // プロジェクト概要
  responsibilities: text, // 担当業務
  environment: text, // 言語・環境
  team: text, // チーム構成
  /** 面接対策メモ: never included in outputs. */
  interviewNotes: z.object({ hardships: text }).default({ hardships: '' }), // 苦労したこと
});

export const careerSchema = z.object({
  companyName: z.string().trim().min(1, '企業名は必須です'),
  period: periodSchema,
  // 企業詳細: all optional free text (values may carry notes such as "3,000万円（退職時点）")
  businessDescription: text, // 事業内容
  listing: text, // 上場区分
  capital: text, // 資本金
  revenue: text, // 売上高
  employees: text, // 従業員数
  employmentType: text, // 雇用形態
  department: text, // 所属部署
  projects: z.array(projectSchema).default([]),
  /** 面接対策メモ: never included in outputs. */
  interviewNotes: z
    .object({ reasonForJoining: text, reasonForLeaving: text }) // 入社理由・転職理由
    .default({ reasonForJoining: '', reasonForLeaving: '' }),
});

const resumeContentObject = z.object({
  fullName: text, // 氏名
  summary: text, // 職務要約
  careers: z.array(careerSchema).default([]), // 職務経歴 (newest or oldest first, as the user orders them)
  skills: text, // 活かせる経験・スキル
  selfPr: text, // 自己PR
  /** 面接対策メモ: never included in outputs. */
  interviewNotes: z
    .object({
      strengths: text, // 強み
      weaknesses: text, // 弱み
      /** Legacy resume-wide 転職理由, kept only while there is no career to move it to (see migrateLegacyResume). */
      reasonForChange: z.string().optional(),
    })
    .default({ strengths: '', weaknesses: '' }),
});

/** Index of the most recent career: ongoing first, then by end month, then by start month. -1 when there is none. */
export function latestCareerIndex(careers: { period?: { from?: string; to?: string } }[]): number {
  const key = (c: { period?: { from?: string; to?: string } }) =>
    `${c.period?.to ?? '9999-99'}|${c.period?.from ?? ''}`;
  return careers.reduce((best, c, i) => (best < 0 || key(c) > key(careers[best]) ? i : best), -1);
}

/**
 * Move the legacy resume-wide `interviewNotes.reasonForChange` to the most recent career's 転職理由.
 * Applied whenever a resume is parsed, so stored documents and old backups are upgraded on read.
 */
function migrateLegacyResume(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return raw;
  const r = raw as { interviewNotes?: { reasonForChange?: unknown }; careers?: unknown };
  const legacy = r.interviewNotes?.reasonForChange;
  if (typeof legacy !== 'string' || !Array.isArray(r.careers)) return raw;
  const { reasonForChange: _, ...notes } = r.interviewNotes ?? {};
  if (!legacy.trim()) return { ...r, interviewNotes: notes };
  const careers = r.careers as { period?: { from?: string; to?: string }; interviewNotes?: Record<string, unknown> }[];
  const target = latestCareerIndex(careers);
  if (target < 0) return raw; // nowhere to move it yet; kept as is
  return {
    ...r,
    interviewNotes: notes,
    careers: careers.map((c, i) => {
      if (i !== target) return c;
      const current = String(c.interviewNotes?.reasonForLeaving ?? '').trim();
      const reasonForLeaving = current ? `${current}\n${legacy}` : legacy;
      return { ...c, interviewNotes: { reasonForJoining: '', ...c.interviewNotes, reasonForLeaving } };
    }),
  };
}

/** Editable content of the resume. */
export const resumeContentSchema = z.preprocess(migrateLegacyResume, resumeContentObject);

/** PUT /api/resume: the whole document with the version it was based on (0 = not saved yet). */
export const resumePutSchema = z.preprocess(
  migrateLegacyResume,
  resumeContentObject.extend({ version: z.number().int().nonnegative() }),
);

/** Stored / returned resume. */
export const resumeSchema = z.preprocess(
  migrateLegacyResume,
  resumeContentObject.extend({
    version: z.number().int().nonnegative(),
    updatedAt: z.string(),
  }),
);

export type Period = z.infer<typeof periodSchema>;
export type Project = z.output<typeof projectSchema>;
export type Career = z.output<typeof careerSchema>;
export type ResumeContent = z.output<typeof resumeContentSchema>;
export type ResumeContentInput = z.input<typeof resumeContentObject>;
export type Resume = z.output<typeof resumeSchema>;

export const EMPTY_RESUME_CONTENT: ResumeContent = resumeContentSchema.parse({});

export const emptyProject = (from: string): Project => projectSchema.parse({ period: { from } });
/** A blank career for the editor (company name is filled in by the user before saving). */
export const emptyCareer = (from: string): Career => ({
  companyName: '',
  period: { from },
  businessDescription: '',
  listing: '',
  capital: '',
  revenue: '',
  employees: '',
  employmentType: '',
  department: '',
  projects: [],
  interviewNotes: { reasonForJoining: '', reasonForLeaving: '' },
});
