import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('binary search coordinates belong to the selected signed window', () => {
  const checks = [
    ['binary_search_leftmost', -8, 1], ['binary_search_rightmost', -8, 2],
    ['binary_search_leftmost', 17, 4], ['binary_search_rightmost', 17, 5],
    ['binary_search_leftmost', 9, 3], ['binary_search_rightmost', 9, 4],
    ['binary_search_leftmost', -97, 0], ['binary_search_rightmost', -97, 0],
    ['binary_search_leftmost', 101, 7], ['binary_search_rightmost', 101, 8],
    ['binary_search', 5, 3], ['binary_search', 43, 6], ['binary_search', 9, -1],
  ] as const;
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const slice of [false, true]) {
    it(`v${version} receiver=${receiver} slice=${slice}`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("Binary search signed window")
a = ${slice ? 'array.from(-97, -31, -8, -8, 5, 17, 17, 43, 71, 101)' : 'array.from(-31, -8, -8, 5, 17, 17, 43, 71)'}
s = ${slice ? 'a.slice(1, 9)' : 'a'}
${checks.map(([method, target], i) => `plot(${receiver ? `s.${method}(${target})` : `array.${method}(s, ${target})`}, "Check${i}")`).join('\n')}
plot(s.get(0), "First")
plot(s.get(7), "Last")
plot(s.size(), "Size")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (let i = 0; i < checks.length; i++) expect(getPlot(result, `Check${i}`).values).toEqual(Array(3).fill(checks[i][2]));
      expect(getPlot(result, 'First').values).toEqual([-31, -31, -31]);
      expect(getPlot(result, 'Last').values).toEqual([71, 71, 71]);
      expect(getPlot(result, 'Size').values).toEqual([8, 8, 8]);
    });
  }
});
