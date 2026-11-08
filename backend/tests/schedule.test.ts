import { beforeEach, describe, expect, test } from 'vitest';
import type { Company } from '@jobdash/shared';
import { call, clearTable } from './helpers';

const BASE = '/api/companies';
const company = { companyName: 'A社', phase: '一次面接', action: '要日程調整' };
const slotA = { start: '2026-11-04T17:00', end: '2026-11-04T18:00' };
const slotB = { start: '2026-11-05T10:00', end: '2026-11-05T11:00' };

beforeEach(clearTable);

async function create(extra: Record<string, unknown> = {}) {
  return (await call<Company>('POST', BASE, { ...company, ...extra })).body;
}

describe('preferred slots', () => {
  test('are sorted, de-duplicated and cleared with an empty list', async () => {
    const c = await create();
    const set = await call<Company>('PUT', `${BASE}/${c.id}/preferred-slots`, { version: 1, slots: [slotB, slotA, slotA] });
    expect(set.status).toBe(200);
    expect(set.body.preferredSlots).toEqual([slotA, slotB]);

    const cleared = await call<Company>('PUT', `${BASE}/${c.id}/preferred-slots`, { version: 2, slots: [] });
    expect('preferredSlots' in cleared.body).toBe(false);
  });

  test('reject invalid slots and stale versions', async () => {
    const c = await create();
    const bad = { start: slotA.end, end: slotA.start };
    expect((await call('PUT', `${BASE}/${c.id}/preferred-slots`, { version: 1, slots: [bad] })).status).toBe(400);
    expect((await call('PUT', `${BASE}/${c.id}/preferred-slots`, { version: 9, slots: [slotA] })).status).toBe(409);
  });
});

describe('interviews', () => {
  test('confirming an interview clears preferred slots and fills an empty next action', async () => {
    const c = await create();
    await call('PUT', `${BASE}/${c.id}/preferred-slots`, { version: 1, slots: [slotA, slotB] });

    const res = await call<Company>('PUT', `${BASE}/${c.id}/interviews/first`, { version: 2, ...slotB });
    expect(res.status).toBe(200);
    expect(res.body.interviews).toEqual([{ stage: '一次面接', ...slotB }]);
    expect('preferredSlots' in res.body).toBe(false);
    expect(res.body.nextActionAt).toBe(slotB.start);
  });

  test('an existing next action is kept', async () => {
    const c = await create({ nextActionAt: '2026-11-01T09:00' });
    const res = await call<Company>('PUT', `${BASE}/${c.id}/interviews/first`, { version: 1, ...slotA });
    expect(res.body.nextActionAt).toBe('2026-11-01T09:00');
  });

  test('one interview per stage; other stages are kept; preferred slots for the next stage can be added', async () => {
    const c = await create();
    await call('PUT', `${BASE}/${c.id}/interviews/first`, { version: 1, ...slotB });
    const moved = await call<Company>('PUT', `${BASE}/${c.id}/interviews/first`, { version: 2, ...slotA });
    expect(moved.body.interviews).toEqual([{ stage: '一次面接', ...slotA }]);

    // After the first interview, preferred slots for the second one can be entered
    const pref = { start: '2026-11-10T13:00', end: '2026-11-10T15:00' };
    const withPref = await call<Company>('PUT', `${BASE}/${c.id}/preferred-slots`, { version: 3, slots: [pref] });
    expect(withPref.body.interviews).toHaveLength(1);
    expect(withPref.body.preferredSlots).toEqual([pref]);

    const second = { start: '2026-11-10T14:00', end: '2026-11-10T15:00' };
    const res = await call<Company>('PUT', `${BASE}/${c.id}/interviews/second`, { version: 4, ...second });
    expect(res.body.interviews).toEqual([
      { stage: '一次面接', ...slotA },
      { stage: '二次面接', ...second },
    ]);
    expect('preferredSlots' in res.body).toBe(false);
  });

  test('remove an interview', async () => {
    const c = await create();
    await call('PUT', `${BASE}/${c.id}/interviews/final`, { version: 1, ...slotA });
    const res = await call<Company>('DELETE', `${BASE}/${c.id}/interviews/final?version=2`);
    expect(res.status).toBe(200);
    expect('interviews' in res.body).toBe(false);
    expect((await call('DELETE', `${BASE}/${c.id}/interviews/final?version=3`)).status).toBe(404);
  });

  test('unknown stage, missing version and stale version', async () => {
    const c = await create();
    expect((await call('PUT', `${BASE}/${c.id}/interviews/third`, { version: 1, ...slotA })).status).toBe(404);
    expect((await call('PUT', `${BASE}/${c.id}/interviews/first`, slotA)).status).toBe(400);
    expect((await call('DELETE', `${BASE}/${c.id}/interviews/first`)).status).toBe(400);
    expect((await call('PUT', `${BASE}/${c.id}/interviews/first`, { version: 5, ...slotA })).status).toBe(409);
  });

  test('interviews cannot be changed through PATCH', async () => {
    const c = await create();
    const res = await call<Company>('PATCH', `${BASE}/${c.id}`, { version: 1, interviews: [{ stage: '一次面接', ...slotA }] });
    expect(res.body.interviews).toBeUndefined();
  });
});
