import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { InMemoryRequestDatafeed } from '../requestDatafeed';
import { executeCompiled, tryCompile } from './execute';

const citation = 'https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#timeframes-must-include-a-multiplier';
const bars = [0, 1, 2].map((index) => ({
  time: Date.UTC(2026, 9, 2) + index * 86400000,
  open: 10, high: 12, low: 9, close: 11, volume: 100,
}));

function run(source: string, options?: Parameters<typeof executeCompiled>[3]) {
  const compiled = tryCompile(parse(source));
  expect(compiled.success).toBe(true);
  if (!compiled.success) throw new Error(compiled.unsupported.join(', '));
  const result = executeCompiled(compiled, bars, undefined, options);
  expect(result).not.toBeNull();
  expect(result!.errors).toEqual([]);
  return result!.plots.map((plot) => plot.values);
}

describe('versioned timeframe.period multiplier', () => {
  for (const version of [3, 4, 5, 6]) {
    it.each(['D', 'W', 'M'])('uses the documented %s comparison branch in v' + version, (period) => {
      const declaration = version <= 4 ? 'study' : 'indicator';
      const source = `//@version=${version}\n${declaration}("period")
plot(timeframe.period == "${period}" ? 1 : 0)
plot(timeframe.period == "1${period}" ? 1 : 0)`;
      expect(run(source, { runtime: { timeframe: { period } } }), citation).toEqual([
        bars.map(() => version < 6 ? 1 : 0),
        bars.map(() => version < 6 ? 0 : 1),
      ]);
    });

    it.each(['1D', '2D', '1W', '3M', '60', '1S', '1T'])('preserves explicit period %s in v' + version, (period) => {
      const declaration = version <= 4 ? 'study' : 'indicator';
      expect(run(`//@version=${version}\n${declaration}("period")\nplot(timeframe.period == "${period}" ? 1 : 0)`, {
        runtime: { timeframe: { period } },
      })).toEqual([bars.map(() => 1)]);
    });
  }

  it.each([5, 6])('applies the boundary to a declaration timeframe in v%i', (version) => {
    expect(run(`//@version=${version}\nindicator("period", timeframe="D")\nplot(timeframe.period == "1D" ? 1 : 0)`, {
      runtime: { timeframe: { period: '60' } },
    }), citation).toEqual([bars.map(() => version === 6 ? 1 : 0)]);
  });

  it.each([5, 6])('applies the boundary inside request.security in v%i', (version) => {
    const requestDatafeed = new InMemoryRequestDatafeed([{ symbol: 'TEST', timeframe: 'D', bars }]);
    expect(run(`//@version=${version}\nindicator("period")
plot(request.security("TEST", "D", timeframe.period == "1D" ? 1 : 0))`, {
      requestDatafeed, runtime: { timeframe: { period: 'D' }, syminfo: { tickerid: 'TEST' } },
    }), citation).toEqual([bars.map(() => version === 6 ? 1 : 0)]);
  });
});
