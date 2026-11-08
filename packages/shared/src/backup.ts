import { z } from 'zod';
import { agentSchema } from './agent';
import { companySchema } from './company';

/** Bump when the stored data shape changes in a way that needs migration. */
export const SCHEMA_VERSION = 3;

export const backupSchema = z.object({
  app: z.literal('jobdash'),
  schemaVersion: z.literal(SCHEMA_VERSION),
  exportedAt: z.string(),
  companies: z.array(companySchema),
  agents: z.array(agentSchema),
});

export type Backup = z.infer<typeof backupSchema>;
