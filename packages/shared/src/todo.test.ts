import { describe, expect, test } from 'vitest';
import { compareTodos, type Todo, todoInputSchema, todoPatchSchema } from './todo';

describe('schemas', () => {
  test('defaults and trimming', () => {
    expect(todoInputSchema.parse({ title: ' 面談 ' })).toEqual({
      title: '面談',
      details: '',
      nextActionAt: undefined,
      status: 'open',
      agentId: undefined,
    });
  });

  test.each([{ title: '' }, { title: 'a', status: 'doing' }, { title: 'a', nextActionAt: '2026-11-10 10:00' }])(
    'rejects %j',
    (input) => {
      expect(todoInputSchema.safeParse(input).success).toBe(false);
    },
  );

  test('patch requires version; "" and null clear the date', () => {
    expect(todoPatchSchema.safeParse({ status: 'done' }).success).toBe(false);
    const p = todoPatchSchema.parse({ version: 1, nextActionAt: '' });
    expect('nextActionAt' in p && p.nextActionAt === undefined).toBe(true);
    expect(todoPatchSchema.parse({ version: 1, nextActionAt: null }).nextActionAt).toBeNull();
  });
});

test('compareTodos: open by date (undated last), then done by completion (newest first)', () => {
  const t = (id: string, patch: Partial<Todo>): Todo => ({
    id,
    title: id,
    details: '',
    status: 'open',
    version: 1,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '',
    ...patch,
  });
  const list = [
    t('done-old', { status: 'done', completedAt: '2026-11-01T00:00:00.000Z' }),
    t('undated', {}),
    t('d2', { nextActionAt: '2026-11-12' }),
    t('d1-timed', { nextActionAt: '2026-11-10T09:00' }),
    t('d1', { nextActionAt: '2026-11-10' }),
    t('done-new', { status: 'done', completedAt: '2026-11-05T00:00:00.000Z' }),
  ];
  expect([...list].sort(compareTodos).map((x) => x.id)).toEqual([
    'd1-timed',
    'd1',
    'd2',
    'undated',
    'done-new',
    'done-old',
  ]);
});
