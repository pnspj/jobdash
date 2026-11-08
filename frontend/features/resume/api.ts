import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Resume, ResumeContent } from '@jobdash/shared';
import { apiRequest } from '@/lib/apiClient';

const KEY = ['resume'] as const;

export const resumeApi = {
  get: () => apiRequest<Resume>('/api/resume'),
  /** Replace the whole resume; `version` is the version the draft was based on. */
  save: (content: ResumeContent, version: number) =>
    apiRequest<Resume>('/api/resume', { method: 'PUT', body: { ...content, version } }),
};

export const useResume = () => useQuery({ queryKey: KEY, queryFn: resumeApi.get });

export function useSaveResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ content, version }: { content: ResumeContent; version: number }) => resumeApi.save(content, version),
    onSuccess: (saved) => qc.setQueryData(KEY, saved),
  });
}
