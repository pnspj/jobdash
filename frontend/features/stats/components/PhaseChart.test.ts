import { expect, test } from 'vitest';
import { niceTicks } from './PhaseChart';

test('niceTicks rounds up to an even step', () => {
  expect(niceTicks(0)).toEqual([0, 1]);
  expect(niceTicks(4)).toEqual([0, 1, 2, 3, 4]);
  expect(niceTicks(6)).toEqual([0, 2, 4, 6]);
  expect(niceTicks(13)).toEqual([0, 5, 10, 15]);
  expect(niceTicks(38)).toEqual([0, 10, 20, 30, 40]);
});
