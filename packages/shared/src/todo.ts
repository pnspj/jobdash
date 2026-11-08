import { z } from 'zod';
import { optionalLocalDateTime, optionalText, versionField } from './fields';

export const TODO_STATUSES = ['open', 'done'] as const;
export type TodoStatus = (typeof TODO_STATUSES)[number];
export const TODO_STATUS_LABELS: Record<TodoStatus, string> = { open: '未完了', done: '完了' };

/**
 * A to-do. With `agentId` it belongs to an agent (shown on the agent page);
 * without it, it is a dashboard to-do (e.g. "職務経歴書に現在の業務を書く").
 */
export const todoInputSchema = z.object({
  title: z.string().trim().min(1, '項目名は必須です'),
  details: z.string().default(''),
  nextActionAt: optionalLocalDateTime,
  status: z.enum(TODO_STATUSES).default('open'),
  agentId: optionalText,
});

/** Partial update with optimistic locking. `nextActionAt` is cleared with "" or null. */
export const todoPatchSchema = z.object({
  version: versionField,
  title: todoInputSchema.shape.title.optional(),
  details: z.string().optional(),
  nextActionAt: z.union([z.null(), optionalLocalDateTime]),
  status: z.enum(TODO_STATUSES).optional(),
});

export const todoSchema = z.object({
  id: z.string(),
  title: z.string(),
  details: z.string(),
  nextActionAt: z.string().optional(),
  status: z.enum(TODO_STATUSES),
  /** When the to-do was marked done (ISO). Removed when reopened. */
  completedAt: z.string().optional(),
  agentId: z.string().optional(),
  version: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TodoInput = z.input<typeof todoInputSchema>;
export type TodoInputParsed = z.output<typeof todoInputSchema>;
export type TodoPatch = z.input<typeof todoPatchSchema>;
export type TodoPatchParsed = z.output<typeof todoPatchSchema>;
export type Todo = z.infer<typeof todoSchema>;

/** Filter for listing to-dos: one agent's, the dashboard's (no agent), or all. */
export const todoListQuerySchema = z.object({
  agentId: z.string().optional(),
  scope: z.enum(['all', 'agent', 'dashboard']).default('all'),
});

/** The two example to-dos registered by the tutorial's "さっそく始める". */
export const STARTER_TODOS: TodoInput[] = [
  { title: 'エージェントに登録する' },
  { title: '職務経歴書に現在の業務を書く' },
];

/** Open first; open ones by next action (undated last); done ones by completion, newest first. */
export function compareTodos(a: Todo, b: Todo): number {
  if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
  if (a.status === 'done') return (b.completedAt ?? '').localeCompare(a.completedAt ?? '');
  if (!a.nextActionAt || !b.nextActionAt) return Number(!a.nextActionAt) - Number(!b.nextActionAt);
  const pad = (s: string) => (s.length === 10 ? `${s}T99:99` : s);
  return pad(a.nextActionAt).localeCompare(pad(b.nextActionAt)) || a.createdAt.localeCompare(b.createdAt);
}
