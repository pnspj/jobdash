import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Backup } from '@jobdash/shared';
import { apiRequest } from '@/lib/apiClient';

export const backupApi = {
  export: () => apiRequest<Backup>('/api/backup'),
  restore: (backup: unknown) =>
    apiRequest<{ restored: Record<string, number> }>('/api/backup/restore', { method: 'POST', body: backup }),
};

export function useRestoreBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: backupApi.restore,
    // Every cached entity may have changed
    onSuccess: () => qc.invalidateQueries(),
  });
}
