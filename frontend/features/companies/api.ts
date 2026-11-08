import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Company, CompanyInput, CompanyPatch } from '@jobdash/shared';
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
  import: (records: CompanyInput[]) =>
    apiRequest<{ imported: number }>(`${BASE}/import`, { method: 'POST', body: { records } }),
  update: (id: string, patch: CompanyPatch) =>
    apiRequest<Company>(`${BASE}/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch }),
  remove: (id: string) => apiRequest<void>(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
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
