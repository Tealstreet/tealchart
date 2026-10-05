import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const forecasts = [
  ['earnings.future_eps', 'earnings_future_eps', 'float', 1.375, -0.625],
  ['earnings.future_revenue', 'earnings_future_revenue', 'float', 123_456_789.5, 234_567_890.25],
  ['dividends.future_ex_date', 'dividends_future_ex_date', 'int', 1_777_680_000_000, 1_785_628_800_000],
] as const;

describe('documented supplied forecast snapshots', () => {
  for (const [member, field, kind, initial, revised] of forecasts) {
    const source = `//@version=6\nindicator("Forecast snapshot")\nvalue = ${member}\nplot(value, "Value")`;

    it(`infers ${member} as series ${kind}`, () => {
      const result = checkProgram(parse(source));
      expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
      expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toEqual({ kind, qualifier: 'series' });
    });

    it(`preserves the supplied ${member} value and units`, () => {
      const result = runCompatScript(source, { engineOptions: { runtime: { syminfo: { [field]: initial } } } });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Value').values).toEqual(compatibilityBars.map(() => initial));
    });

    it(`returns na for unavailable ${member}`, () => {
      const result = runCompatScript(
        `//@version=6\nindicator("Unavailable forecast")\nplot(na(${member}) ? 1 : 0, "Missing")`,
      );
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Missing').values).toEqual(compatibilityBars.map(() => 1));
    });

    it(`reads ${member} once per calculation and refreshes on recalculation`, () => {
      let reads = 0;
      const syminfo = Object.defineProperty({}, field, {
        enumerable: true,
        get: () => (++reads === 1 ? initial : revised),
      });
      const options = { engineOptions: { runtime: { syminfo } } };
      const first = runCompatScript(source, options);
      expect(first.errors).toEqual([]);
      expect(getPlot(first, 'Value').values).toEqual(compatibilityBars.map(() => initial));
      expect(reads).toBe(1);
      const recalculated = runCompatScript(source, options);
      expect(recalculated.errors).toEqual([]);
      expect(getPlot(recalculated, 'Value').values).toEqual(compatibilityBars.map(() => revised));
      expect(reads).toBe(2);
    });
  }
});
