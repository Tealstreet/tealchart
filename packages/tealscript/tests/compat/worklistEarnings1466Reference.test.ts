import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// pine-v6-reference variables: earnings.future_eps; synthetic host values, no native value credit.
describe('documented forecast rank 1466', () => {
  const source =
    '//@version=6\nindicator("Synthetic forecast 1466")\nvalue = earnings.future_eps\nreadForecast() => earnings.future_eps\nplot(value, "Direct")\nplot(readForecast(), "UDF")\n';
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
        runtime: { syminfo: { earnings_future_eps: -0.875, earnings_future_revenue: 999.25, currency: 'EUR' } },
      },
    });
    expect(result.errors).toEqual([]);
    for (const title of ['Direct', 'UDF'])
      expect(getPlot(result, title).values).toEqual(compatibilityBars.map(() => -0.875));
  });
});
