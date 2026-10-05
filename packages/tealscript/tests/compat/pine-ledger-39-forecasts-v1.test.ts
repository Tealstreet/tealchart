import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const forecasts = [
  ['dividends.future_amount', 'dividends_future_amount', 'float', 0.375, 0.75],
  ['dividends.future_pay_date', 'dividends_future_pay_date', 'int', 1_735_689_600_000, 1_738_368_000_000],
  ['earnings.future_period_end_time', 'earnings_future_period_end_time', 'int', 1_735_603_200_000, 1_743_379_200_000],
] as const;

// Reference forecasts use initial symbol metadata until script recalculation.
// These witnesses exercise supplied metadata, not external provider availability.
describe('documented corporate forecast values', () => {
  for (const [name, field, kind, initial, revised] of forecasts) {
    const source = `//@version=6\nindicator("Forecast")\nvalue = ${name}\nplot(value, "Forecast")`;

    it(`infers ${name} as series ${kind}`, () => {
      const result = checkProgram(parse(source));
      expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
      expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toEqual({ kind, qualifier: 'series' });
    });

    it(`carries the supplied numeric ${name} without changing its units`, () => {
      const result = runCompatScript(source, { engineOptions: { runtime: { syminfo: { [field]: initial } } } });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Forecast').values).toEqual(Array(compatibilityBars.length).fill(initial));
    });

    it(`returns na for unavailable ${name}`, () => {
      const result = runCompatScript(
        `//@version=6\nindicator("Missing forecast")\nplot(na(${name}) ? 1 : 0, "Missing")`,
      );
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Missing').values).toEqual(Array(compatibilityBars.length).fill(1));
    });

    it(`samples ${name} once per calculation and resamples on recalculation`, () => {
      let reads = 0;
      const syminfo = Object.defineProperty({}, field, {
        enumerable: true,
        get: () => (++reads === 1 ? initial : revised),
      });
      const options = { engineOptions: { runtime: { syminfo } } };
      const first = runCompatScript(source, options);
      expect(first.errors).toEqual([]);
      expect(getPlot(first, 'Forecast').values).toEqual(Array(compatibilityBars.length).fill(initial));
      expect(reads).toBe(1);
      const recalculated = runCompatScript(source, options);
      expect(recalculated.errors).toEqual([]);
      expect(getPlot(recalculated, 'Forecast').values).toEqual(Array(compatibilityBars.length).fill(revised));
      expect(reads).toBe(2);
    });
  }
});
