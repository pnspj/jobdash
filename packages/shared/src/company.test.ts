import { describe, expect, test } from 'vitest';
import { companyImportSchema, companyInputSchema, companyPatchSchema } from './company';

const valid = {
  companyName: '  株式会社A  ',
  companyUrl: '',
  agentId: ' agent-1 ',
  phase: '一次面接',
  action: '選考結果待ち',
  nextActionAt: '2026-11-09T15:00',
};

describe('companyInputSchema', () => {
  test('trims, applies defaults and turns empty optionals into undefined', () => {
    const parsed = companyInputSchema.parse(valid);
    expect(parsed).toEqual({
      companyName: '株式会社A',
      companyUrl: undefined,
      agentId: 'agent-1',
      agentJobUrl: undefined,
      phase: '一次面接',
      action: '選考結果待ち',
      nextActionAt: '2026-11-09T15:00',
      details: '',
    });
  });

  test('accepts date-only and empty nextActionAt', () => {
    expect(companyInputSchema.parse({ ...valid, nextActionAt: '2026-11-09' }).nextActionAt).toBe('2026-11-09');
    expect(companyInputSchema.parse({ ...valid, nextActionAt: '' }).nextActionAt).toBeUndefined();
    expect(companyInputSchema.parse({ ...valid, nextActionAt: undefined }).nextActionAt).toBeUndefined();
  });

  test.each([
    ['companyName', ''],
    ['phase', 'x'],
    ['action', '辞退/不通過'],
    ['nextActionAt', '2026-11-09 15:00'],
    ['nextActionAt', '2026-13-01'],
    ['nextActionAt', '2026-11-09T24:00'],
  ])('rejects invalid %s = %j', (key, value) => {
    expect(companyInputSchema.safeParse({ ...valid, [key]: value }).success).toBe(false);
  });
});

describe('companyPatchSchema', () => {
  test('requires version', () => {
    expect(companyPatchSchema.safeParse({ phase: '二次面接' }).success).toBe(false);
  });

  test('omitted keys stay absent so they are not touched', () => {
    const parsed = companyPatchSchema.parse({ version: 1, phase: '二次面接' });
    expect(parsed).toEqual({ version: 1, phase: '二次面接' });
    expect('nextActionAt' in parsed).toBe(false);
  });

  test('"" and null both mean "clear"', () => {
    const a = companyPatchSchema.parse({ version: 1, nextActionAt: '', companyUrl: null });
    expect('nextActionAt' in a && a.nextActionAt === undefined).toBe(true);
    expect(a.companyUrl).toBeNull();
  });
});

describe('companyImportSchema', () => {
  test('rejects empty records', () => {
    expect(companyImportSchema.safeParse({ records: [] }).success).toBe(false);
  });
});
