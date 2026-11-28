import { type Backup, SCHEMA_VERSION } from '@jobdash/shared';
import { BadRequestError } from '../errors';
import { readData, replaceData } from '../store/dataStore';

export const backupService = {
  /** Only a saved resume is exported. */
  async export(): Promise<Backup> {
    const { companies, agents, todos, resume } = await readData();
    return {
      app: 'jobdash',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      companies,
      agents,
      todos,
      ...(resume ? { resume } : {}),
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
    await replaceData({
      companies: backup.companies,
      agents: backup.agents,
      todos,
      ...(backup.resume ? { resume: backup.resume } : {}),
    });
    return {
      companies: backup.companies.length,
      agents: backup.agents.length,
      todos: todos.length,
      resume: backup.resume ? 1 : 0,
    };
  },
};
