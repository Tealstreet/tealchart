import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { InMemoryRequestDatafeed } from '../../src/runtime';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

const start = Date.UTC(2024, 0, 1);
const bars = [0, 1, 2, 3, 4, 5].map((minute) => ({
  time: start + minute * 60_000, open: 101, high: 102, low: 100, close: 101, volume: 1,
}));
const requested = [17, -9, 23].map((close, index) => ({
  time: start + index * 120_000, open: close, high: close + 1, low: close - 1, close, volume: 1,
}));

// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-3/#default-behaviour-of-security-function-has-changed
// Lookahead defaults off from v3; requested values publish at their confirmation bar.
describe('supported-version security lookahead default', () => {
  for (const version of [3, 4, 5, 6]) {
    it(`keeps default off distinct from explicit on in v${version}`, () => {
      const name = version < 5 ? 'security' : 'request.security';
      const source = `//@version=${version}
${version < 5 ? 'study' : 'indicator'}("Lookahead default")
plot(${name}("ALT", "2", close), title="Default")
plot(${name}("ALT", "2", close, lookahead=barmerge.lookahead_off), title="Off")
plot(${name}("ALT", "2", close, lookahead=barmerge.lookahead_on), title="On")`;
      expect(checkProgram(parse(source)).diagnostics).toEqual([]);
      const result = runCompatScript(source, {
        bars,
        engineOptions: {
          runtime: { timeframe: { period: '1' }, syminfo: { timezone: 'Etc/UTC' } },
          requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'ALT', timeframe: '2', bars: requested }]),
        },
      });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Default').values).toEqual([null, 17, 17, -9, -9, 23]);
      expect(getPlot(result, 'Off').values).toEqual([null, 17, 17, -9, -9, 23]);
      expect(getPlot(result, 'On').values).toEqual([17, 17, -9, -9, 23, 23]);
    });
  }
});
