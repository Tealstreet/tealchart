import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const prices = [9, 7, 9, 2, 8, 1, 6, 6, -1, 5];
const bars = prices.map((close, index) => ({
  time: Date.UTC(2024, 0, 1, 0, index),
  open: -close,
  high: Math.abs(close) + 1,
  low: -Math.abs(close) - 1,
  close,
  volume: 1,
}));
const setup =
  'n = bar_index == 3 or bar_index == 7 ? 4 : bar_index == 4 or bar_index == 8 ? 1 : bar_index == 5 or bar_index == 9 ? 3 : 2';
const expected = [null, null, 100, null, 100, 0, 50, 75, 0, 100 / 3];
const opposite = [null, null, 50, null, 0, 100, 50, 50, 100, 200 / 3];

// The reference allows series length; native 18ace/9e9 settle preceding slots and count*100/length.
describe('TA percentrank retains finite source history across length changes', () => {
  for (const version of [5, 6]) {
    for (const source of ['close', 'int(close)']) {
      for (const call of [
        'ta.percentrank(src, n)',
        'ta.percentrank(length=n, source=src)',
        'ta.percentrank(source=src, n)',
      ]) {
        it(`v${version} ${source} evaluates ${call} over preceding chart slots`, () => {
          const result = runCompatScript(
            `//@version=${version}
indicator("Series percentrank length")
${setup}
src = ${source}
plot(${call}, "Rank")`,
            { bars },
          );
          expect(result.errors).toEqual([]);
          expect(getPlot(result, 'Rank').values).toEqual(expected);
        });
      }
    }

    it(`v${version} retains distinct source histories for two written function calls`, () => {
      const result = runCompatScript(
        `//@version=${version}
indicator("Function percentrank length")
rank(float source, int length) =>
    ta.percentrank(source, length)
${setup}
plot(rank(close, n), "Rank")
plot(rank(open, n), "Opposite")`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Rank').values).toEqual(expected);
      expect(getPlot(result, 'Opposite').values).toEqual(opposite);
    });

    for (const length of ['2', 'input.int(2, "Length")']) {
      it(`v${version} preserves fixed length ${length}`, () => {
        const result = runCompatScript(
          `//@version=${version}
indicator("Fixed percentrank length")
n = ${length}
plot(ta.percentrank(close, n), "Rank")`,
          { bars },
        );
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'Rank').values).toEqual([null, null, 100, 0, 50, 0, 50, 100, 0, 50]);
      });
    }
  }
});
