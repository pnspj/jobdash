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
  companyName: z.string().trim().min(1, '会社名は必須です'),
  period: periodSchema,
  employees: text, // 従業員数 (free text, e.g. "約300名")
  employmentType: text, // 雇用形態
  projects: z.array(projectSchema).default([]),
});

/** Editable content of the resume. */
export const resumeContentSchema = z.object({
  fullName: text, // 氏名
  summary: text, // 職務要約
  careers: z.array(careerSchema).default([]), // 職務経歴 (newest or oldest first, as the user orders them)
  skills: text, // 活かせる経験・スキル
  selfPr: text, // 自己PR
  /** 面接対策メモ: never included in outputs. */
  interviewNotes: z
    .object({ strengths: text, weaknesses: text, reasonForChange: text }) // 強み・弱み・転職理由
    .default({ strengths: '', weaknesses: '', reasonForChange: '' }),
});

/** PUT /api/resume: the whole document with the version it was based on (0 = not saved yet). */
export const resumePutSchema = resumeContentSchema.extend({ version: z.number().int().nonnegative() });

/** Stored / returned resume. */
export const resumeSchema = resumeContentSchema.extend({
  version: z.number().int().nonnegative(),
  updatedAt: z.string(),
});

export type Period = z.infer<typeof periodSchema>;
export type Project = z.output<typeof projectSchema>;
export type Career = z.output<typeof careerSchema>;
export type ResumeContent = z.output<typeof resumeContentSchema>;
export type ResumeContentInput = z.input<typeof resumeContentSchema>;
export type Resume = z.output<typeof resumeSchema>;

export const EMPTY_RESUME_CONTENT: ResumeContent = resumeContentSchema.parse({});

export const emptyProject = (from: string): Project => projectSchema.parse({ period: { from } });
/** A blank career for the editor (company name is filled in by the user before saving). */
export const emptyCareer = (from: string): Career => ({
  companyName: '',
  period: { from },
  employees: '',
  employmentType: '',
  projects: [],
});
