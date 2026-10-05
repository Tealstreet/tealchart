import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// pine-v6-reference variables: earnings.future_revenue; synthetic host values, no native value credit.
describe('documented forecast rank 1473', () => {
  const source =
    '//@version=6\nindicator("Synthetic forecast 1473")\nvalue = earnings.future_revenue\nreadForecast() => earnings.future_revenue\nplot(value, "Direct")\nplot(readForecast(), "UDF")\n';
  it('keeps unavailable values missing with an unrelated forecast supplied', () => {
    const result = runCompatScript(source, { engineOptions: { runtime: { syminfo: { earnings_future_eps: 3.25 } } } });
    expect(result.errors).toEqual([]);
    for (const title of ['Direct', 'UDF'])
      expect(getPlot(result, title).values).toEqual(compatibilityBars.map(() => null));
  });
  it('preserves the supplied fractional value through direct and UDF reads', () => {
    const result = runCompatScript(source, {
      engineOptions: {
        runtime: { syminfo: { earnings_future_revenue: 87654321.75, earnings_future_eps: 3.25, currency: 'EUR' } },
      },
    });
    expect(result.errors).toEqual([]);
    for (const title of ['Direct', 'UDF'])
      expect(getPlot(result, title).values).toEqual(compatibilityBars.map(() => 87654321.75));
  });
});
