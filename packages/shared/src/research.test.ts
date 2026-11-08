import { describe, expect, test } from 'vitest';
import { companyPatchSchema } from './company';
import { EMPTY_RESEARCH, mergeResearch, parseRating, parseTags, researchSchema, splitLines } from './research';

describe('researchSchema', () => {
  test('defaults to empty values', () => {
    expect(researchSchema.parse({})).toEqual(EMPTY_RESEARCH);
  });

  test('tags are trimmed, de-duplicated and keep their order', () => {
    expect(researchSchema.parse({ tags: [' SI ', '自社サービス', '', 'SI'] }).tags).toEqual(['SI', '自社サービス']);
  });

  test.each([
    ['rating', 4],
    ['rating', 0],
    ['interviewCount', 0],
    ['interviewCount', 1.5],
    ['tags', Array.from({ length: 21 }, (_, i) => `t${i}`)],
  ])('rejects %s = %j', (key, value) => {
    expect(researchSchema.safeParse({ [key]: value }).success).toBe(false);
  });
});

describe('mergeResearch', () => {
  const current = { ...EMPTY_RESEARCH, motivation: '理由', tags: ['SI'], rating: 3 as const, interviewCount: 2 };

  test('only given keys change; null clears optional numbers', () => {
    const patch = companyPatchSchema.parse({ version: 1, research: { concerns: '残業', rating: null } }).research!;
    expect(mergeResearch(current, patch)).toEqual({ ...current, concerns: '残業', rating: undefined });
    expect('rating' in mergeResearch(current, patch)).toBe(false);
  });

  test('works when the company has no research yet', () => {
    expect(mergeResearch(undefined, { tags: ['SES'] })).toEqual({ ...EMPTY_RESEARCH, tags: ['SES'] });
  });
});

test('parseRating', () => {
  expect(parseRating('')).toBeUndefined();
  expect(parseRating('2')).toBe(2);
  expect(parseRating('３')).toBe(3);
  expect(parseRating('★★')).toBe(2);
  expect(parseRating('★☆☆')).toBe(1);
  expect(parseRating('5')).toBeNull();
  expect(parseRating('高')).toBeNull();
});

test('parseTags and splitLines', () => {
  expect(parseTags('自社サービス, SaaS／BtoB、 受託開発')).toEqual(['自社サービス', 'SaaS', 'BtoB', '受託開発']);
  expect(splitLines(' サービスが先進的 \n\n技術スタックが合う\r\n')).toEqual([
    'サービスが先進的',
    '技術スタックが合う',
  ]);
});
