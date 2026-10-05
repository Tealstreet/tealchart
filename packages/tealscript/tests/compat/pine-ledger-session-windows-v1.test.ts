import { describe, expect, it } from 'vitest';

import type { Bar } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

// Ledger1756–1758: official sessions manual examples, day masks, and exchange timezone.
// https://www.tradingview.com/pine-script-docs/concepts/sessions/#creating-time-based-sessions
const barsAt = (times: number[]): Bar[] => times.map((time, index) => ({ time, open: index + 1, high: index + 2, low: index, close: index + 1, volume: 10 }));
const runtime = (timezone = 'Etc/UTC') => ({ syminfo: { timezone }, timeframe: { period: '1', multiplier: 1, isminutes: true, isintraday: true } });

for (const version of [5, 6]) {
  describe(`Pine v${version} documented session windows`, () => {
    for (const member of ['time', 'time_close']) {
      it(`${member} assigns overnight weekday masks to the ending trading day`, () => {
        const times = [Date.UTC(2024, 0, 7, 16, 59), Date.UTC(2024, 0, 7, 17), Date.UTC(2024, 0, 8, 16, 59), Date.UTC(2024, 0, 12, 16, 59), Date.UTC(2024, 0, 12, 17), Date.UTC(2024, 0, 13, 10)];
        const result = runCompatScript(`//@version=${version}\nindicator("Overnight trading day")\nplot(not na(${member}("1", "1700-1700:23456", "Etc/UTC")) ? 1 : 0, "value")`, { bars: barsAt(times), engineOptions: { runtime: runtime() } });
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'value').values).toEqual([0, 1, 1, 1, 0, 0]);
      });

      it(`${member} includes both session periods and excludes their break`, () => {
        const times = [8 * 60 + 59, 9 * 60, 15 * 60 + 59, 16 * 60, 16 * 60 + 59, 17 * 60, 19 * 60 + 59, 20 * 60].map((minute) => Date.UTC(2024, 0, 8, 0, minute));
        const result = runCompatScript(`//@version=${version}\nindicator("Session break")\nplot(not na(${member}("1", "0900-1600,1700-2000:23456", "Etc/UTC")) ? 1 : 0, "value")`, { bars: barsAt(times), engineOptions: { runtime: runtime() } });
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'value').values).toEqual([0, 1, 1, 0, 0, 1, 1, 0]);
      });

      it(`${member} defaults to the exchange timezone across daylight saving`, () => {
        const times = [Date.UTC(2024, 2, 8, 9, 30), Date.UTC(2024, 2, 8, 14, 30), Date.UTC(2024, 2, 11, 13, 30), Date.UTC(2024, 2, 11, 20)];
        const result = runCompatScript(`//@version=${version}\nindicator("Exchange timezone")\nplot(not na(${member}("1", "0930-1600:23456")) ? 1 : 0, "default")\nplot(not na(${member}("1", "0930-1600:23456", "Etc/UTC")) ? 1 : 0, "utc")`, { bars: barsAt(times), engineOptions: { runtime: runtime('America/New_York') } });
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'default').values).toEqual([0, 1, 1, 0]);
        expect(getPlot(result, 'utc').values).toEqual([1, 1, 1, 0]);
      });
    }
  });
}
