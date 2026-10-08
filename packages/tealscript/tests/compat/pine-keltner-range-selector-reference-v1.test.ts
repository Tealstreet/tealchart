import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('Keltner default selects true range across price gaps', () => {
  for (const version of [5, 6]) {
    it(`v${version} separates default true range from high-low span`, () => {
      const closes = [10, 10, 26, 26, 8, 8];
      const result = runCompatScript(
        `//@version=${version}
indicator("Keltner range selector")
[d,du,dl] = ta.kc(5.0, 1, 2.0)
[t,tu,tl] = ta.kc(series = 5.0, length = 1, mult = 2.0, useTrueRange = true)
[f,fu,fl] = ta.kc(5.0, 1, 2.0, false)
plot(d,"DefaultMiddle")
plot(du,"DefaultUpper")
plot(dl,"DefaultLower")
plot(t,"TrueMiddle")
plot(tu,"TrueUpper")
plot(tl,"TrueLower")
plot(f,"FalseMiddle")
plot(fu,"FalseUpper")
plot(fl,"FalseLower")
plot(ta.kcw(5.0, 1, 2.0),"DefaultWidth")
plot(ta.kcw(useTrueRange = true, mult = 2.0, length = 1, series = 5.0),"TrueWidth")
plot(ta.kcw(5.0, 1, 2.0, false),"FalseWidth")`,
        {
          bars: compatibilityBars
            .slice(0, 6)
            .map((bar, i) => ({ ...bar, open: closes[i], close: closes[i], high: closes[i] + 1, low: closes[i] - 1 })),
        },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      for (const prefix of ['Default', 'True', 'False']) {
        const spans = prefix === 'False' ? [2, 2, 2, 2, 2] : [2, 17, 2, 19, 2];
        expect(getPlot(result, `${prefix}Middle`).values.slice(1)).toEqual([5, 5, 5, 5, 5]);
        expect(getPlot(result, `${prefix}Upper`).values.slice(1)).toEqual(spans.map((span) => 5 + 2 * span));
        expect(getPlot(result, `${prefix}Lower`).values.slice(1)).toEqual(spans.map((span) => 5 - 2 * span));
        getPlot(result, `${prefix}Width`)
          .values.slice(1)
          .forEach((value, i) => expect(value).toBeCloseTo((4 * spans[i]) / 5, 12));
      }
    });
  }
});
