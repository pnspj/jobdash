import type { Todo, TodoInputParsed, TodoPatchParsed } from '@jobdash/shared';
import { BadRequestError } from '../errors';
import { agentRepository, todoRepository } from '../repositories';

async function assertAgentExists(agentId: string | undefined) {
  if (agentId && !(await agentRepository.get(agentId))) {
    throw new BadRequestError(`agentId: エージェントが見つかりません (${agentId})`);
  }
}

export interface TodoFilter {
  agentId?: string;
  /** 'agent' = to-dos of any agent, 'dashboard' = to-dos without an agent */
  scope?: 'all' | 'agent' | 'dashboard';
}

export const todoService = {
  async list({ agentId, scope = 'all' }: TodoFilter = {}): Promise<Todo[]> {
    const todos = await todoRepository.list();
    return todos.filter((t) => {
      if (agentId !== undefined) return t.agentId === agentId;
      if (scope === 'agent') return Boolean(t.agentId);
      if (scope === 'dashboard') return !t.agentId;
      return true;
    });
  },

  get: (id: string) => todoRepository.getOrThrow(id),

  async create(input: TodoInputParsed): Promise<Todo> {
    await assertAgentExists(input.agentId);
    const created = await todoRepository.create(input);
    // A to-do created as done gets its completion time right away
    return created.status === 'done'
      ? todoRepository.update(created.id, { version: created.version, completedAt: created.createdAt })
      : created;
  },

  async createMany(inputs: TodoInputParsed[]): Promise<Todo[]> {
    for (const agentId of new Set(inputs.flatMap((i) => (i.agentId ? [i.agentId] : []))))
      await assertAgentExists(agentId);
    return todoRepository.createMany(inputs);
  },

  /** Status changes keep `completedAt` in sync: set when done, removed when reopened. */
  async update(id: string, patch: TodoPatchParsed): Promise<Todo> {
    const changes: Record<string, unknown> & { version: number } = { ...patch };
    if (patch.status === 'done') {
      const current = await todoRepository.getOrThrow(id);
      if (current.status !== 'done') changes.completedAt = new Date().toISOString();
    } else if (patch.status === 'open') {
      changes.completedAt = null;
    }
    return todoRepository.update(id, changes);
  },

  delete: (id: string) => todoRepository.delete(id),

  /** Delete every to-do of an agent (used when the agent is deleted). Returns the number deleted. */
  deleteByAgent: (agentId: string) => todoRepository.deleteWhere((t) => t.agentId === agentId),
};
