import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const reference = 'https://www.tradingview.com/pine-script-reference/v6/#var_session.ispremarket';
const source = `//@version=6
indicator("Premarket chart interval")
plot(session.ispremarket ? 1 : 0, "Premarket")
plot(timeframe.isintraday ? 1 : 0, "Intraday")`;

function verify(period: string, intraday: boolean, suppliedSession: boolean, expected: number): void {
  const result = runCompatScript(source, {
    engineOptions: {
      runtime: {
        syminfo: { timezone: 'UTC' },
        timeframe: { period, isintraday: intraday },
        session: { timezone: 'UTC', premarket: suppliedSession ? '0000-2359:1234567' : undefined },
      },
    },
  });
  expect(result.errors, reference).toEqual([]);
  expect(getPlot(result, 'Premarket').values, reference).toEqual(compatibilityBars.map(() => expected));
  expect(getPlot(result, 'Intraday').values, reference).toEqual(compatibilityBars.map(() => Number(intraday)));
}

describe('session.ispremarket nonintraday remark', () => {
  for (const period of ['1D', '1W', '1M']) {
    it(`${period} stays false even when the exchange premarket window includes every bar`, () => {
      verify(period, false, true, 0);
    });
  }

  it('intraday charts retain supplied premarket classification and missing-session false', () => {
    for (const period of ['1', '1S']) {
      verify(period, true, true, 1);
      verify(period, true, false, 0);
    }
  });
});
