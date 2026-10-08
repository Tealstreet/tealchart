import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// The documented series bool selects the current estimate; omitted biased defaults to true.
// https://www.tradingview.com/pine-script-reference/v6/#fun_array.covariance
describe('array covariance current biased selector', () => {
  for (const version of [5, 6]) {
    for (const method of [false, true]) {
      it(`v${version} method=${method} uses alternating flags and population default`, () => {
        const call = (selector?: string) => {
          const argument = selector === undefined ? '' : `, biased=${selector}`;
          return method ? `left.covariance(right${argument})` : `array.covariance(left, right${argument})`;
        };
        const result = runCompatScript(
          `//@version=${version}
indicator("Covariance current flag")
left = array.from(-2.0, 0.0, 2.0)
right = array.from(9.0, -3.0, 6.0)
population = bar_index % 2 == 0
plot(${call('population')}, "Current")
plot(${call('not population')}, "Opposite")
plot(${call()}, "Default")`,
          { bars: compatibilityBars.slice(0, 4) },
        );
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'Current').values).toEqual([-2, -3, -2, -3]);
        expect(getPlot(result, 'Opposite').values).toEqual([-3, -2, -3, -2]);
        expect(getPlot(result, 'Default').values).toEqual([-2, -2, -2, -2]);
      });
    }
  }
});
