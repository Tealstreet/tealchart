import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Pine ta.sma ignores missing source values and averages length finite samples.
describe('SMA qualifying samples after finite warmup', () => {
  for (const version of [5, 6]) {
    for (const named of [false, true]) {
      it(`v${version} named=${named} retains finite sample pairs across holes`, () => {
        const call = named ? 'ta.sma(source=source, length=2)' : 'ta.sma(source, 2)';
        const result = runCompatScript(`//@version=${version}
indicator("SMA qualifying samples")
source = bar_index % 2 == 1 ? float(na) : 2.0 + bar_index * 2.0
plot(${call}, "Mean")`, { bars: compatibilityBars.slice(0, 7) });
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        expect(getPlot(result, 'Mean').values.slice(2)).toEqual([4, 4, 8, 8, 12]);
      });
    }
  }
});
