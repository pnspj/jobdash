import {
  normalizeSlots,
  sortSlots,
  mergeResearch,
  normalizeShortName,
  type Company,
  type CompanyInputParsed,
  type CompanyPatchParsed,
  type InterviewStage,
  type TimeSlot,
  type companyImportRecordSchema,
} from '@jobdash/shared';
import type { z } from 'zod';
import { agentRepository, companyRepository } from '../repositories';
import { BadRequestError, NotFoundError } from '../errors';
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
    if (!patch.research) return companyRepository.update(id, patch);
    // Research is merged field by field so that saving one section does not wipe the others.
    // The repository still checks `version`, so a concurrent change is detected.
    const current = await companyRepository.getOrThrow(id);
    return companyRepository.update(id, { ...patch, research: mergeResearch(current.research, patch.research) });
  },

  delete: (id: string) => companyRepository.delete(id),

  /**
   * Confirm (or move) the interview of a stage.
   * - replaces any interview of the same stage
   * - clears all preferred slots
   * - sets nextActionAt to the interview start when it is empty
   */
  async setInterview(id: string, stage: InterviewStage, slot: TimeSlot, version: number): Promise<Company> {
    const current = await companyRepository.getOrThrow(id);
    const interviews = sortSlots([...(current.interviews ?? []).filter((i) => i.stage !== stage), { stage, ...slot }]);
    return companyRepository.update(id, {
      version,
      interviews,
      preferredSlots: null,
      ...(current.nextActionAt ? {} : { nextActionAt: slot.start }),
    });
  },

  async removeInterview(id: string, stage: InterviewStage, version: number): Promise<Company> {
    const current = await companyRepository.getOrThrow(id);
    const interviews = (current.interviews ?? []).filter((i) => i.stage !== stage);
    if (interviews.length === (current.interviews ?? []).length) throw new NotFoundError(`${stage}の日時は登録されていません`);
    return companyRepository.update(id, { version, interviews: interviews.length > 0 ? interviews : null });
  },

  /** Replace the preferred slots (sorted, duplicates removed). An empty list clears them. */
  async setPreferredSlots(id: string, slots: TimeSlot[], version: number): Promise<Company> {
    const normalized = normalizeSlots(slots);
    return companyRepository.update(id, { version, preferredSlots: normalized.length > 0 ? normalized : null });
  },

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
