import type { Todo, TodoInput, TodoPatch } from '@jobdash/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';

const BASE = '/api/todos';

/** All to-dos are cached under one key; screens filter locally (data volume is small). */
export const todoKeys = { all: ['todos'] as const };

export const todoApi = {
  list: () => apiRequest<Todo[]>(BASE),
  create: (input: TodoInput) => apiRequest<Todo>(BASE, { method: 'POST', body: input }),
  update: (id: string, patch: TodoPatch) =>
    apiRequest<Todo>(`${BASE}/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch }),
  remove: (id: string) => apiRequest<void>(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export const useTodos = () => useQuery({ queryKey: todoKeys.all, queryFn: todoApi.list });

export function useTodoMutations() {
  const qc = useQueryClient();
  const onSuccess = () => qc.invalidateQueries({ queryKey: todoKeys.all });
  return {
    create: useMutation({ mutationFn: todoApi.create, onSuccess }),
    createMany: useMutation({
      mutationFn: async (inputs: TodoInput[]) => {
        for (const input of inputs) await todoApi.create(input);
      },
      onSuccess,
    }),
    /** Pass the to-do being edited so its current version is attached. */
    update: useMutation({
      mutationFn: ({ todo, patch }: { todo: Todo; patch: Omit<TodoPatch, 'version'> }) =>
        todoApi.update(todo.id, { ...patch, version: todo.version }),
      onSuccess,
    }),
    remove: useMutation({ mutationFn: todoApi.remove, onSuccess }),
  };
}
