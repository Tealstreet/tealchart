import { expect, it } from 'vitest';
import { KC, KCW } from './ta-classes';

it('advances high-low range independently of the Keltner basis source', () => {
  const kc = new KC(3, 2, false);
  const width = new KCW(3, 2, false);
  const outputs = [10, 10, 10, NaN, 10].map((source, i) => {
    const high = i === 3 ? 20 : 11;
    const low = i === 3 ? 0 : 9;
    return { bands: kc.compute(source, high, low, 10), width: width.compute(source, high, low, 10) };
  });
  // Range EMA is 2 -> 11 -> 6.5 even while the explicit source is missing.
  expect(outputs[4].bands).toEqual([10, 23, -3]);
  expect(outputs[4].width).toBe(2.6);
});
