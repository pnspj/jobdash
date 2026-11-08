import {
  normalizeShortName,
  type Company,
  type CompanyInputParsed,
  type CompanyPatchParsed,
  type companyImportRecordSchema,
} from '@jobdash/shared';
import type { z } from 'zod';
import { agentRepository, companyRepository } from '../repositories';
import { BadRequestError } from '../errors';
import { agentService } from './agentService';

async function assertAgentExists(agentId: string | null | undefined) {
  if (agentId && !(await agentRepository.get(agentId))) {
    throw new BadRequestError(`agentId: エージェントが見つかりません (${agentId})`);
  }
}

type ImportRecord = z.output<typeof companyImportRecordSchema>;

export const companyService = {
  list: () => companyRepository.list(),
  get: (id: string) => companyRepository.getOrThrow(id),

  async create(input: CompanyInputParsed): Promise<Company> {
    await assertAgentExists(input.agentId);
    return companyRepository.create(input);
  },

  async update(id: string, patch: CompanyPatchParsed): Promise<Company> {
    await assertAgentExists(patch.agentId);
    return companyRepository.update(id, patch);
  },

  delete: (id: string) => companyRepository.delete(id),

  /** Bulk create. `agentShortName` is resolved to an existing agent or a newly created one. */
  async import(records: ImportRecord[]): Promise<{ imported: number; agentsCreated: number }> {
    const before = (await agentRepository.list()).length;
    const shortNames = records.flatMap((r) => (r.agentShortName && !r.agentId ? [r.agentShortName] : []));
    const ids = shortNames.length > 0 ? await agentService.resolveShortNames(shortNames) : new Map<string, string>();
    for (const id of new Set(records.flatMap((r) => (r.agentId ? [r.agentId] : [])))) await assertAgentExists(id);

    const inputs: CompanyInputParsed[] = records.map(({ agentShortName, ...rest }) => ({
      ...rest,
      agentId: rest.agentId ?? (agentShortName ? ids.get(normalizeShortName(agentShortName)) : undefined),
    }));
    const created = await companyRepository.createMany(inputs);
    const after = shortNames.length > 0 ? (await agentRepository.list()).length : before;
    return { imported: created.length, agentsCreated: after - before };
  },
};
