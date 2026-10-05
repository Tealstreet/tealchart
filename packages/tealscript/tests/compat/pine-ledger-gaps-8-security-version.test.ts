import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { InMemoryRequestDatafeed } from '../../src/runtime';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

// Independent v5 migration contract: security(..., resolution, ...) becomes
// request.security(..., timeframe, ...); the positional slot is retained.
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/
const start = Date.UTC(2024, 0, 1);
const bars = [0, 1, 2, 3].map((minute) => ({
  time: start + minute * 60_000, open: 100, high: 110, low: 90, close: 101, volume: 100,
}));
const requested = [17, 9, 23].map((close, index) => ({
  time: start + index * 120_000, open: close, high: close + 1, low: close - 1, close, volume: 100,
}));

function script(version: number, call: string): string {
  return `//@version=${version}\n${version < 5 ? 'study' : 'indicator'}("Security migration")\nplot(${call}, title="requested")`;
}

function values(source: string) {
  const result = runCompatScript(source, {
    bars,
    engineOptions: {
      runtime: { timeframe: { period: '1' } },
      requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'ALT', timeframe: '2', bars: requested }]),
    },
  });
  expect(result.errors).toEqual([]);
  return getPlot(result, 'requested').values;
}

describe('ledger gaps 8: security namespace and resolution migration', () => {
  it.each([
    'symbol="ALT", resolution="2", expression=close, lookahead=barmerge.lookahead_on',
    '"ALT", resolution="2", expression=close, lookahead=barmerge.lookahead_on',
    'symbol="ALT", resolution="2", close, barmerge.gaps_off, barmerge.lookahead_on',
  ])('binds the v4 resolution slot: %s', (argumentsSource) => {
    const source = script(4, `security(${argumentsSource})`);
    expect(checkProgram(parse(source)).diagnostics).toEqual([]);
    expect(values(source)).toEqual([17, 17, 9, 9]);
    expect(values(script(4, 'security("ALT", "2", close, lookahead=barmerge.lookahead_on)'))).toEqual([17, 17, 9, 9]);
  });

  for (const version of [5, 6]) {
    it(`rejects the old global name in v${version}`, () => {
      expect(checkProgram(parse(script(version, 'security("ALT", "2", close)'))).diagnostics).toEqual([
        expect.objectContaining({ code: 'version-mismatch', message: expect.stringContaining('Use request.security()') }),
      ]);
      const source = script(version, 'request.security("ALT", "2", close, lookahead=barmerge.lookahead_on)');
      expect(checkProgram(parse(source)).diagnostics).toEqual([]);
      expect(values(source)).toEqual([17, 17, 9, 9]);
    });

    it(`uses timeframe and rejects resolution in v${version}`, () => {
      const old = script(version, 'request.security(symbol="ALT", resolution="2", expression=close)');
      expect(checkProgram(parse(old)).diagnostics).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'unknown-argument', message: "Unknown argument 'resolution' for request.security()" }),
      ]));
      const source = script(version, 'request.security(symbol="ALT", timeframe="2", expression=close, lookahead=barmerge.lookahead_on)');
      expect(checkProgram(parse(source)).diagnostics).toEqual([]);
      expect(values(source)).toEqual([17, 17, 9, 9]);
    });
  }
});
