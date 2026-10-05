import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

// Independent contract: v5 migration guide, renamed function parameters.
// Ledger 294-295: v4 time(resolution=...) becomes v5 time(timeframe=...).
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/
const start = Date.UTC(2024, 0, 1);
const bars = [0, 1, 2, 3].map((minute) => ({
  time: start + minute * 60_000,
  open: 10, high: 12, low: 9, close: 11, volume: 100,
}));

function source(version: number, argument: string): string {
  return `//@version=${version}\n${version < 5 ? 'study' : 'indicator'}("Time migration")\nplot(time(${argument}), title="bucket")`;
}

describe('ledger gaps 8: time resolution parameter migration', () => {
  for (const argument of ['resolution="2"', 'session="0000-0000:1234567", resolution="2"']) {
    it(`accepts and executes the v4 named slot: ${argument}`, () => {
      const script = source(4, argument);
      expect(checkProgram(parse(script)).diagnostics).toEqual([]);
      const result = runCompatScript(script, { bars, engineOptions: { runtime: { timeframe: { period: '1' }, syminfo: { timezone: 'Etc/UTC' } } } });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'bucket').values).toEqual([start, start, start + 120_000, start + 120_000]);
    });
  }
  for (const version of [5, 6]) {
    it(`uses the modern named slot and rejects resolution in v${version}`, () => {
      expect(checkProgram(parse(source(version, 'timeframe="2"'))).diagnostics).toEqual([]);
      expect(checkProgram(parse(source(version, 'resolution="2"'))).diagnostics).toEqual([
        expect.objectContaining({ code: 'unknown-argument', message: "Unknown argument 'resolution' for time()" }),
      ]);
      const result = runCompatScript(source(version, 'timeframe="2"'), { bars, engineOptions: { runtime: { timeframe: { period: '1' }, syminfo: { timezone: 'Etc/UTC' } } } });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'bucket').values).toEqual([start, start, start + 120_000, start + 120_000]);
    });
  }
});
