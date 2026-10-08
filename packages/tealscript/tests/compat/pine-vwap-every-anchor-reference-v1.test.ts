import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('VWAP consecutive anchors each restart accumulation', () => {
  for (const version of [5, 6]) {
    it(`v${version} returns the current source on every finite positive-volume reset`, () => {
      const closes = [-6, 4, 0, -8, 12, -3];
      const volumes = [2, 5, 3, 7, 11, 13];
      const result = runCompatScript(
        `//@version=${version}
indicator("VWAP every anchor")
plot(ta.vwap(close, true), "Positional")
plot(ta.vwap(anchor = true, source = close), "Named")`,
        {
          bars: compatibilityBars.slice(0, 6).map((bar, i) => ({ ...bar, close: closes[i], volume: volumes[i] })),
        },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      for (const title of ['Positional', 'Named']) expect(getPlot(result, title).values).toEqual(closes);
    });
  }
});
