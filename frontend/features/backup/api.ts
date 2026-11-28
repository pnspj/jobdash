import type { Backup } from '@jobdash/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';

export const backupApi = {
  location: () => apiRequest<{ file: string }>('/api/data'),
  export: () => apiRequest<Backup>('/api/backup'),
  restore: (backup: unknown) =>
    apiRequest<{ restored: Record<string, number> }>('/api/backup/restore', { method: 'POST', body: backup }),
  deleteAll: () =>
    apiRequest<{ deleted: Record<string, number> }>('/api/data?confirm=DELETE_ALL', { method: 'DELETE' }),
};

/**
 * Every cached entity may have changed after these operations.
 * Reset (not just invalidate) the cache: otherwise a page opened later would first render
 * the stale data (e.g. the resume editor would initialize its draft from a deleted resume).
 */
function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.resetQueries();
}

export function useRestoreBackup() {
  const invalidateAll = useInvalidateAll();
  return useMutation({ mutationFn: backupApi.restore, onSuccess: invalidateAll });
}

export function useDeleteAllData() {
  const invalidateAll = useInvalidateAll();
  return useMutation({ mutationFn: backupApi.deleteAll, onSuccess: invalidateAll });
}

/** Path of the data file on the machine running the API. */
export function useDataLocation() {
  return useQuery({ queryKey: ['data-location'], queryFn: backupApi.location, staleTime: Number.POSITIVE_INFINITY });
}
