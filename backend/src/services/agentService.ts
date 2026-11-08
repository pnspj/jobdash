import { type Agent, type AgentInputParsed, type AgentPatchParsed, normalizeShortName } from '@jobdash/shared';
import { ConflictError } from '../errors';
import { agentRepository, companyRepository } from '../repositories';

async function assertShortNameAvailable(shortName: string, exceptId?: string) {
  const key = normalizeShortName(shortName);
  const agents = await agentRepository.list();
  const dup = agents.find((a) => a.id !== exceptId && normalizeShortName(a.shortName) === key);
  if (dup) throw new ConflictError(`略称「${shortName}」は「${dup.name}」で使用されています`);
}

export const agentService = {
  list: () => agentRepository.list(),
  get: (id: string) => agentRepository.getOrThrow(id),

  async create(input: AgentInputParsed): Promise<Agent> {
    await assertShortNameAvailable(input.shortName);
    return agentRepository.create(input);
  },

  async update(id: string, patch: AgentPatchParsed): Promise<Agent> {
    if (patch.shortName !== undefined) await assertShortNameAvailable(patch.shortName, id);
    return agentRepository.update(id, patch);
  },

  /** Agents referenced by companies cannot be deleted. */
  async delete(id: string): Promise<void> {
    await agentRepository.getOrThrow(id);
    const linked = (await companyRepository.list()).filter((c) => c.agentId === id);
    if (linked.length > 0) {
      const names = linked
        .slice(0, 3)
        .map((c) => c.companyName)
        .join('、');
      throw new ConflictError(
        `${linked.length}社の企業に紐づいているため削除できません（${names}${linked.length > 3 ? ' など' : ''}）`,
      );
    }
    await agentRepository.delete(id);
  },

  /**
   * Resolve short names to agent ids, creating agents for unknown short names.
   * Matching is case/width-insensitive. Returns normalized short name -> id.
   */
  async resolveShortNames(shortNames: string[]): Promise<Map<string, string>> {
    const ids = new Map((await agentRepository.list()).map((a) => [normalizeShortName(a.shortName), a.id]));
    // Keep the first spelling seen for each normalized short name
    const missing = new Map<string, string>();
    for (const s of shortNames) {
      const key = normalizeShortName(s);
      if (!ids.has(key) && !missing.has(key)) missing.set(key, s.trim());
    }
    if (missing.size > 0) {
      const created = await agentRepository.createMany(
        [...missing.values()].map((s) => ({ name: s, shortName: s, memo: '' })),
      );
      for (const a of created) ids.set(normalizeShortName(a.shortName), a.id);
    }
    return ids;
  },
};
