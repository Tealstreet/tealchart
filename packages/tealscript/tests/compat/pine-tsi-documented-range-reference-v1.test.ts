import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

describe('TSI documented unit range on varied finite prices', () => {
  for (const version of [5, 6]) {
    for (const direction of [1, -1]) {
      it(`v${version} direction=${direction} keeps ready observations within [-1, 1]`, () => {
        const changes = [1, 2, 3, 4, 1, 2, -30, -2, -3, -4, -1, -2, 30];
        let price = 100;
        const bars = Array.from({ length: 65 }, (_, i) => {
          if (i > 0) price += changes[(i - 1) % changes.length];
          const close = direction * price;
          return { time: 1700000000000 + i * 60000, open: close, high: close + 1, low: close - 1, close, volume: 1 };
        });
        const result = runCompatScript(
          `//@version=${version}
indicator("TSI unit range")
plot(ta.tsi(close, 3, 5), "Positional")
plot(ta.tsi(long_length = 5, short_length = 3, source = close), "Named")`,
          { bars },
        );
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        for (const title of ['Positional', 'Named']) {
          const finite = getPlot(result, title).values.filter(
            (value): value is number => typeof value === 'number' && Number.isFinite(value),
          );
          expect(finite.length).toBeGreaterThan(16);
          expect(new Set(finite.map((value) => value.toFixed(6))).size).toBeGreaterThan(4);
          for (const value of finite) {
            expect(value).toBeGreaterThanOrEqual(-1);
            expect(value).toBeLessThanOrEqual(1);
          }
        }
      });
    }
  }
});
