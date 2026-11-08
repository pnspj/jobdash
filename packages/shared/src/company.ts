import { z } from 'zod';
import { LOCAL_DATETIME_RE } from './datetime';
import { ACTION_STATUSES, SELECTION_PHASES } from './enums';

/** Trimmed string; empty becomes undefined. */
const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === '' ? undefined : v))
  .optional();

/** "" clears the value; otherwise must be YYYY-MM-DD or YYYY-MM-DDTHH:mm. */
const optionalLocalDateTime = z
  .union([z.literal(''), z.string().regex(LOCAL_DATETIME_RE, 'YYYY-MM-DD または YYYY-MM-DDTHH:mm 形式で指定してください')])
  .transform((v) => (v === '' ? undefined : v))
  .optional();

/** Fields the user can edit. */
export const companyInputSchema = z.object({
  companyName: z.string().trim().min(1, '会社名は必須です'),
  companyUrl: optionalText,
  agent: z.string().trim().default(''),
  agentJobUrl: optionalText,
  phase: z.enum(SELECTION_PHASES),
  action: z.enum(ACTION_STATUSES),
  nextActionAt: optionalLocalDateTime,
  details: z.string().default(''),
});

/**
 * Partial update. `version` is required for optimistic locking.
 * Optional fields can be cleared by sending "" (or null).
 */
export const companyPatchSchema = z.object({
  version: z.number().int().nonnegative(),
  companyName: companyInputSchema.shape.companyName.optional(),
  companyUrl: z.union([z.null(), optionalText]),
  agent: z.string().trim().optional(),
  agentJobUrl: z.union([z.null(), optionalText]),
  phase: companyInputSchema.shape.phase.optional(),
  action: companyInputSchema.shape.action.optional(),
  nextActionAt: z.union([z.null(), optionalLocalDateTime]),
  details: z.string().optional(),
});

export const IMPORT_MAX_RECORDS = 1000;

export const companyImportSchema = z.object({
  records: z.array(companyInputSchema).min(1).max(IMPORT_MAX_RECORDS),
});

/** Stored / returned company. */
export const companySchema = z.object({
  id: z.string(),
  companyName: z.string(),
  companyUrl: z.string().optional(),
  agent: z.string(),
  agentJobUrl: z.string().optional(),
  phase: z.enum(SELECTION_PHASES),
  action: z.enum(ACTION_STATUSES),
  nextActionAt: z.string().optional(),
  details: z.string(),
  version: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** Request payload type (before defaults/transforms are applied). */
export type CompanyInput = z.input<typeof companyInputSchema>;
/** Parsed payload type (after defaults/transforms). */
export type CompanyInputParsed = z.output<typeof companyInputSchema>;
export type CompanyPatch = z.input<typeof companyPatchSchema>;
export type CompanyPatchParsed = z.output<typeof companyPatchSchema>;
export type Company = z.infer<typeof companySchema>;

/** Editable fields of an existing company, e.g. to prefill a form. */
export const toCompanyInput = (c: Company): CompanyInputParsed => ({
  companyName: c.companyName,
  companyUrl: c.companyUrl,
  agent: c.agent,
  agentJobUrl: c.agentJobUrl,
  phase: c.phase,
  action: c.action,
  nextActionAt: c.nextActionAt,
  details: c.details,
});
