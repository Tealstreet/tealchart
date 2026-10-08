import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('Nonzero constant inputs have zero dispersion', () => {
  for (const version of [5, 6]) {
    for (const source of [-5, 5]) {
      it(`v${version} source=${source} has zero population and sample dispersion`, () => {
        const result = runCompatScript(
          `//@version=${version}
indicator("Constant dispersion")
plot(ta.variance(${source}.0, 3), "VarianceDefault")
plot(ta.variance(${source}.0, 3, true), "VariancePopulation")
plot(ta.variance(source = ${source}.0, length = 3, biased = false), "VarianceSample")
plot(ta.stdev(${source}.0, 3), "StdevDefault")
plot(ta.stdev(${source}.0, 3, true), "StdevPopulation")
plot(ta.stdev(source = ${source}.0, length = 3, biased = false), "StdevSample")
plot(ta.dev(${source}.0, 3), "AbsoluteDeviation")`,
          { bars: compatibilityBars.slice(0, 6) },
        );
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        for (const title of [
          'VarianceDefault',
          'VariancePopulation',
          'VarianceSample',
          'StdevDefault',
          'StdevPopulation',
          'StdevSample',
          'AbsoluteDeviation',
        ]) {
          expect(getPlot(result, title).values.slice(2)).toEqual([0, 0, 0, 0]);
        }
      });
    }
  }
});
