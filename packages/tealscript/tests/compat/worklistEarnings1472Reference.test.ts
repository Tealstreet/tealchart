import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// pine-v6-reference variables: earnings.future_eps; synthetic host values, no native value credit.
describe('documented forecast rank 1472', () => {
  const source =
    '//@version=6\nindicator("Synthetic forecast 1472")\nvalue = earnings.future_eps\nreadForecast() => earnings.future_eps\nplot(value, "Direct")\nplot(readForecast(), "UDF")\n';
  it('keeps unavailable values missing with an unrelated forecast supplied', () => {
    const result = runCompatScript(source, {
      engineOptions: { runtime: { syminfo: { earnings_future_revenue: -8.5 } } },
    });
    expect(result.errors).toEqual([]);
    for (const title of ['Direct', 'UDF'])
      expect(getPlot(result, title).values).toEqual(compatibilityBars.map(() => null));
  });
  it('preserves the supplied fractional value through direct and UDF reads', () => {
    const result = runCompatScript(source, {
      engineOptions: {
        runtime: { syminfo: { earnings_future_eps: 1.625, earnings_future_revenue: -8.5, currency: 'EUR' } },
      },
    });
    expect(result.errors).toEqual([]);
    for (const title of ['Direct', 'UDF'])
      expect(getPlot(result, title).values).toEqual(compatibilityBars.map(() => 1.625));
  });
});
