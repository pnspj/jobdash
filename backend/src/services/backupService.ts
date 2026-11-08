import { type Backup, SCHEMA_VERSION } from '@jobdash/shared';
import { batchDelete, batchPut, queryByPrefix } from '../db/operations';
import { BadRequestError } from '../errors';
import { agentRepository, companyRepository } from '../repositories';
import { resumeRepository } from '../repositories/resumeRepository';

/** Only a saved resume (version > 0) is exported. */
async function exportResume(): Promise<{ resume?: Awaited<ReturnType<typeof resumeRepository.get>> }> {
  const resume = await resumeRepository.get();
  return resume.version > 0 ? { resume } : {};
}

export const backupService = {
  async export(): Promise<Backup> {
    return {
      app: 'jobdash',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      companies: await companyRepository.list(),
      agents: await agentRepository.list(),
      ...(await exportResume()),
    };
  },

  /** Replace ALL data with the backup contents. The backup must already be schema-validated. */
  async restore(backup: Backup): Promise<{ companies: number; agents: number; resume: number }> {
    const agentIds = new Set(backup.agents.map((a) => a.id));
    const dangling = backup.companies.filter((co) => co.agentId && !agentIds.has(co.agentId));
    if (dangling.length > 0) {
      throw new BadRequestError(
        `存在しないエージェントを参照している企業があります: ${dangling.map((d) => d.companyName).join('、')}`,
      );
    }
    const existing = await queryByPrefix('');
    await batchDelete(existing as { PK: string; SK: string }[]);
    await batchPut([
      ...backup.agents.map(agentRepository.toItem),
      ...backup.companies.map(companyRepository.toItem),
      ...(backup.resume ? [resumeRepository.toItem(backup.resume)] : []),
    ]);
    return { companies: backup.companies.length, agents: backup.agents.length, resume: backup.resume ? 1 : 0 };
  },
};
