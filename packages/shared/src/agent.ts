import { z } from 'zod';

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === '' ? undefined : v))
  .optional();

/** Fields the user can edit. */
export const agentInputSchema = z.object({
  name: z.string().trim().min(1, 'エージェント名は必須です'),
  shortName: z.string().trim().min(1, '略称は必須です'),
  contactName: optionalText,
  contactEmail: z
    .union([z.literal(''), z.email('メールアドレスの形式が正しくありません')])
    .transform((v) => (v === '' ? undefined : v))
    .optional(),
  contactPhone: optionalText,
  url: optionalText,
  memo: z.string().default(''),
});

/** Partial update with optimistic locking. Optional fields are cleared with "" or null. */
export const agentPatchSchema = z.object({
  version: z.number().int().nonnegative(),
  name: agentInputSchema.shape.name.optional(),
  shortName: agentInputSchema.shape.shortName.optional(),
  contactName: z.union([z.null(), agentInputSchema.shape.contactName]),
  contactEmail: z.union([z.null(), agentInputSchema.shape.contactEmail]),
  contactPhone: z.union([z.null(), agentInputSchema.shape.contactPhone]),
  url: z.union([z.null(), agentInputSchema.shape.url]),
  memo: z.string().optional(),
});

export const agentSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string(),
  contactName: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  url: z.string().optional(),
  memo: z.string(),
  version: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AgentInput = z.input<typeof agentInputSchema>;
export type AgentInputParsed = z.output<typeof agentInputSchema>;
export type AgentPatch = z.input<typeof agentPatchSchema>;
export type AgentPatchParsed = z.output<typeof agentPatchSchema>;
export type Agent = z.infer<typeof agentSchema>;

/** Normalized short name used for uniqueness checks and CSV matching. */
export const normalizeShortName = (s: string) => s.normalize('NFKC').trim().toLowerCase();

/** Build an id -> short name lookup; unknown or missing ids resolve to ''. */
export function agentShortNameLookup(agents: Pick<Agent, 'id' | 'shortName'>[]) {
  const map = new Map(agents.map((a) => [a.id, a.shortName]));
  return (agentId: string | undefined) => (agentId ? (map.get(agentId) ?? '') : '');
}
