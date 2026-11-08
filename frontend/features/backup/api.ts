import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Backup } from '@jobdash/shared';
import { apiRequest } from '@/lib/apiClient';

export const backupApi = {
  export: () => apiRequest<Backup>('/api/backup'),
  restore: (backup: unknown) =>
    apiRequest<{ restored: Record<string, number> }>('/api/backup/restore', { method: 'POST', body: backup }),
  deleteAll: () =>
    apiRequest<{ deleted: Record<string, number> }>('/api/data?confirm=DELETE_ALL', { method: 'DELETE' }),
};

/** Every cached entity may have changed after these operations. */
function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

export function useRestoreBackup() {
  const invalidateAll = useInvalidateAll();
  return useMutation({ mutationFn: backupApi.restore, onSuccess: invalidateAll });
}

export function useDeleteAllData() {
  const invalidateAll = useInvalidateAll();
  return useMutation({ mutationFn: backupApi.deleteAll, onSuccess: invalidateAll });
}
