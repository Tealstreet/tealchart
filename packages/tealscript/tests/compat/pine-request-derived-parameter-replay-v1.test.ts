import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const bars = (base: number) =>
  Array.from({ length: 12 }, (_, i) => ({
    time: i * 60000,
    open: base + i,
    high: base + i + 2,
    low: base + i - 2,
    close: base + i,
    volume: 1,
  }));
function run(version: number, body: string) {
  return runCompatScript(
    `//@version=${version}
indicator("Derived parameter requests", dynamic_requests=true)
${body}`,
    {
      bars: bars(10),
      engineOptions: {
        runtime: { timeframe: { period: '1' }, syminfo: { tickerid: 'TEST', timezone: 'UTC' } },
        requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'ALT', timeframe: '1', bars: bars(80) }]),
      },
    },
  );
}

describe('Requested derived UDF parameters', () => {
  for (const version of [5, 6]) {
    it(`v${version} retains a direct parameter source`, () => {
      const result = run(
        version,
        `f(src) => request.security("ALT", "1", src, lookahead=barmerge.lookahead_on)
plot(f(close), "Actual")
plot(request.security("ALT", "1", close, lookahead=barmerge.lookahead_on), "Control")`,
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      expect(getPlot(result, 'Actual').values).toEqual(getPlot(result, 'Control').values);
    });
    for (const ta of [false, true]) {
      it(`v${version} carries a parameter through ${ta ? 'TA' : 'arithmetic'} local dependencies`, () => {
        const result = run(
          version,
          `f(src) =>
    first = request.security("ALT", "1", src, lookahead=barmerge.lookahead_on)
    derived = ${ta ? 'ta.ema(first, 2)' : 'first + 1'}
    request.security("ALT", "1", derived, lookahead=barmerge.lookahead_on)
plot(f(close), "Actual")
plot(request.security("ALT", "1", ${ta ? 'ta.ema(close, 2)' : 'close + 1'}, lookahead=barmerge.lookahead_on), "Control")`,
        );
        expect(result.errors).toEqual([]);
        expect(result.profile.swallowedErrors ?? []).toEqual([]);
        expect(getPlot(result, 'Actual').values).toEqual(getPlot(result, 'Control').values);
      });
    }
  }
});
