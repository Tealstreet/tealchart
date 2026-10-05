import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// pine-v6-reference variables: earnings.future_revenue; synthetic host values, no native value credit.
describe('documented forecast rank 1467', () => {
  const source =
    '//@version=6\nindicator("Synthetic forecast 1467")\nvalue = earnings.future_revenue\nreadForecast() => earnings.future_revenue\nplot(value, "Direct")\nplot(readForecast(), "UDF")\n';
  it('infers the published variable as series float', () => {
    const checked = checkProgram(parse(source));
    expect(checked.diagnostics.filter((entry) => entry.severity === 'error')).toEqual([]);
    expect(checked.symbols.find((symbol) => symbol.name === 'value')?.type).toEqual({
      kind: 'float',
      qualifier: 'series',
    });
  });
  it('preserves the supplied fractional value through direct and UDF reads', () => {
    const result = runCompatScript(source, {
      engineOptions: {
        runtime: { syminfo: { earnings_future_revenue: 123456789.125, earnings_future_eps: 0.375, currency: 'EUR' } },
      },
    });
    expect(result.errors).toEqual([]);
    for (const title of ['Direct', 'UDF'])
      expect(getPlot(result, title).values).toEqual(compatibilityBars.map(() => 123456789.125));
  });
});
