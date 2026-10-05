import { expect, it } from 'vitest';
import { Stoch } from './ta-classes';

it('preserves the documented undefined flat stochastic ratio instead of returning zero', () => {
  const stoch = new Stoch(2);
  expect(Number.isNaN(stoch.compute(5, 5, 5))).toBe(true);
  expect(Number.isNaN(stoch.compute(5, 5, 5))).toBe(true);
  expect(stoch.compute(6, 7, 5)).toBe(50);
  expect(Number.isNaN(stoch.recompute(5, 5, 5))).toBe(true);
});
