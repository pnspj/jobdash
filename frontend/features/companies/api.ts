import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { stageKeyOf, type Company, type CompanyImportRecord, type CompanyInput, type CompanyPatch, type InterviewStage, type TimeSlot } from '@jobdash/shared';
import { apiRequest } from '@/lib/apiClient';

const BASE = '/api/companies';

export const companyKeys = {
  all: ['companies'] as const,
  detail: (id: string) => ['companies', id] as const,
};

export const companyApi = {
  list: () => apiRequest<Company[]>(BASE),
  get: (id: string) => apiRequest<Company>(`${BASE}/${encodeURIComponent(id)}`),
  create: (input: CompanyInput) => apiRequest<Company>(BASE, { method: 'POST', body: input }),
  import: (records: CompanyImportRecord[]) =>
    apiRequest<{ imported: number; agentsCreated: number }>(`${BASE}/import`, { method: 'POST', body: { records } }),
  update: (id: string, patch: CompanyPatch) =>
    apiRequest<Company>(`${BASE}/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch }),
  remove: (id: string) => apiRequest<void>(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  setInterview: (id: string, stage: InterviewStage, slot: TimeSlot, version: number) =>
    apiRequest<Company>(`${BASE}/${encodeURIComponent(id)}/interviews/${stageKeyOf(stage)}`, {
      method: 'PUT',
      body: { version, ...slot },
    }),
  removeInterview: (id: string, stage: InterviewStage, version: number) =>
    apiRequest<Company>(`${BASE}/${encodeURIComponent(id)}/interviews/${stageKeyOf(stage)}?version=${version}`, {
      method: 'DELETE',
    }),
  setPreferredSlots: (id: string, slots: TimeSlot[], version: number) =>
    apiRequest<Company>(`${BASE}/${encodeURIComponent(id)}/preferred-slots`, { method: 'PUT', body: { version, slots } }),
};

// ---------- hooks ----------

export const useCompanies = () => useQuery({ queryKey: companyKeys.all, queryFn: companyApi.list });

export const useCompany = (id: string) => useQuery({ queryKey: companyKeys.detail(id), queryFn: () => companyApi.get(id) });

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: companyApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: companyKeys.all }),
  });
}

export function useImportCompanies() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: companyApi.import,
    onSuccess: () => qc.invalidateQueries({ queryKey: companyKeys.all }),
  });
}

/** Partial update of one company. The current `version` is attached automatically. */
export function useUpdateCompany(company: Company | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Omit<CompanyPatch, 'version'>) => {
      if (!company) throw new Error('Company is not loaded');
      return companyApi.update(company.id, { ...patch, version: company.version });
    },
    onSuccess: (updated) => {
      qc.setQueryData(companyKeys.detail(updated.id), updated);
      void qc.invalidateQueries({ queryKey: companyKeys.all, exact: true });
    },
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: companyApi.remove,
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: companyKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: companyKeys.all, exact: true });
    },
  });
}

/** Schedule mutations of one company (interviews and preferred slots). */
export function useScheduleMutations(company: Company | undefined) {
  const qc = useQueryClient();
  const onSuccess = (updated: Company) => {
    qc.setQueryData(companyKeys.detail(updated.id), updated);
    void qc.invalidateQueries({ queryKey: companyKeys.all, exact: true });
  };
  const loaded = () => {
    if (!company) throw new Error('Company is not loaded');
    return company;
  };
  return {
    setInterview: useMutation({
      mutationFn: ({ stage, slot }: { stage: InterviewStage; slot: TimeSlot }) =>
        companyApi.setInterview(loaded().id, stage, slot, loaded().version),
      onSuccess,
    }),
    removeInterview: useMutation({
      mutationFn: (stage: InterviewStage) => companyApi.removeInterview(loaded().id, stage, loaded().version),
      onSuccess,
    }),
    setPreferredSlots: useMutation({
      mutationFn: (slots: TimeSlot[]) => companyApi.setPreferredSlots(loaded().id, slots, loaded().version),
      onSuccess,
    }),
  };
}
