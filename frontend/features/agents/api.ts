import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { agentShortNameLookup, type Agent, type AgentInput, type AgentPatch } from '@jobdash/shared';
import { apiRequest } from '@/lib/apiClient';

const BASE = '/api/agents';

export const agentKeys = {
  all: ['agents'] as const,
  detail: (id: string) => ['agents', id] as const,
};

export const agentApi = {
  list: () => apiRequest<Agent[]>(BASE),
  get: (id: string) => apiRequest<Agent>(`${BASE}/${encodeURIComponent(id)}`),
  create: (input: AgentInput) => apiRequest<Agent>(BASE, { method: 'POST', body: input }),
  update: (id: string, patch: AgentPatch) =>
    apiRequest<Agent>(`${BASE}/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch }),
  remove: (id: string) => apiRequest<void>(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

const collator = new Intl.Collator('ja');

/** "MA（○○エージェント）", or just the short name when the name is the same. */
export const agentDisplayName = (a: Pick<Agent, 'name' | 'shortName'>) =>
  a.name === a.shortName ? a.shortName : `${a.shortName}（${a.name}）`;

/** All agents sorted by short name. */
export const useAgents = () =>
  useQuery({
    queryKey: agentKeys.all,
    queryFn: agentApi.list,
    select: (agents) => [...agents].sort((a, b) => collator.compare(a.shortName, b.shortName)),
  });

export const useAgent = (id: string) => useQuery({ queryKey: agentKeys.detail(id), queryFn: () => agentApi.get(id) });

/** Lookup helpers derived from the agent list: id -> short name / agent. */
export function useAgentLookup() {
  const { data: agents = [] } = useAgents();
  return useMemo(() => {
    const byId = new Map(agents.map((a) => [a.id, a]));
    return { agents, shortName: agentShortNameLookup(agents), get: (id: string | undefined) => (id ? byId.get(id) : undefined) };
  }, [agents]);
}

export function useCreateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: agentApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKeys.all, exact: true }),
  });
}

/** Partial update of one agent. The current `version` is attached automatically. */
export function useUpdateAgent(agent: Agent | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Omit<AgentPatch, 'version'>) => {
      if (!agent) throw new Error('Agent is not loaded');
      return agentApi.update(agent.id, { ...patch, version: agent.version });
    },
    onSuccess: (updated) => {
      qc.setQueryData(agentKeys.detail(updated.id), updated);
      void qc.invalidateQueries({ queryKey: agentKeys.all, exact: true });
    },
  });
}

export function useDeleteAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: agentApi.remove,
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: agentKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: agentKeys.all, exact: true });
    },
  });
}
