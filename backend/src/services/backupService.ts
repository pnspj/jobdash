import { type Backup, SCHEMA_VERSION } from '@jobdash/shared';
import { batchDelete, batchPut, queryByPrefix } from '../db/operations';
import { BadRequestError } from '../errors';
import { agentRepository, companyRepository, todoRepository } from '../repositories';
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
      todos: await todoRepository.list(),
      ...(await exportResume()),
    };
  },

  /** Replace ALL data with the backup contents. The backup must already be schema-validated. */
  async restore(backup: Backup): Promise<{ companies: number; agents: number; todos: number; resume: number }> {
    const agentIds = new Set(backup.agents.map((a) => a.id));
    const todos = backup.todos ?? [];
    const references = [
      ...backup.companies.map((co) => ({ name: co.companyName, agentId: co.agentId })),
      ...todos.map((t) => ({ name: t.title, agentId: t.agentId })),
    ];
    const dangling = references.filter((r) => r.agentId && !agentIds.has(r.agentId));
    if (dangling.length > 0) {
      throw new BadRequestError(
        `存在しないエージェントを参照しているデータがあります: ${dangling.map((d) => d.name).join('、')}`,
      );
    }
    const existing = await queryByPrefix('');
    await batchDelete(existing as { PK: string; SK: string }[]);
    await batchPut([
      ...backup.agents.map(agentRepository.toItem),
      ...backup.companies.map(companyRepository.toItem),
      ...todos.map(todoRepository.toItem),
      ...(backup.resume ? [resumeRepository.toItem(backup.resume)] : []),
    ]);
    return {
      companies: backup.companies.length,
      agents: backup.agents.length,
      todos: todos.length,
      resume: backup.resume ? 1 : 0,
    };
  },
};
