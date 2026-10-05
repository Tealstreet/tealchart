import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/#nested-requests
// Empty arguments inherit the execution context, including a requested parent.
const start = Date.UTC(2026, 0, 1);
function bars(closes: number[], minutes: number): Bar[] {
  return closes.map((close, i) => ({
    time: start + i * minutes * 60_000,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 100,
  }));
}
const chart = bars([11, 12, 13, 14, 15, 16], 1);
const chartTwo = bars([13, 15, 17], 2);
const remote = bars([41, 42, 43, 44, 45, 46], 1);
const remoteTwo = bars([71, 72, 73], 2);
function run(expression: string, period = '1') {
  return runCompatScript(`//@version=6\nindicator("Empty context")\nplot(${expression}, "Value")`, {
    bars: period === '2' ? chartTwo : chart,
    engineOptions: {
      runtime: {
        syminfo: { ticker: 'HOME', tickerid: 'LOCAL:HOME', timezone: 'Etc/UTC' },
        timeframe: { period },
      },
      requestDatafeed: new InMemoryRequestDatafeed([
        { symbol: 'LOCAL:HOME', timeframe: '1', bars: chart },
        { symbol: 'LOCAL:HOME', timeframe: '2', bars: chartTwo },
        { symbol: 'REMOTE:ALT', timeframe: '1', bars: remote },
        { symbol: 'REMOTE:ALT', timeframe: '2', bars: remoteTwo },
      ]),
    },
  });
}

describe('request empty symbol and timeframe inheritance', () => {
  for (const [name, symbol, timeframe] of [
    ['explicit control', '"LOCAL:HOME"', '"1"'],
    ['empty symbol', '""', '"1"'],
    ['empty timeframe', '"LOCAL:HOME"', '""'],
    ['both empty', '""', '""'],
  ]) {
    it(`security chart: ${name}`, () => {
      const result = run(`request.security(${symbol}, ${timeframe}, close)`);
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Value').values).toEqual([11, 12, 13, 14, 15, 16]);
    });
  }
  for (const [name, symbol, timeframe] of [
    ['explicit control', '"REMOTE:ALT"', '"2"'],
    ['empty symbol', '""', '"2"'],
    ['empty timeframe', '"REMOTE:ALT"', '""'],
    ['both empty', '""', '""'],
  ]) {
    it(`security requested parent: ${name}`, () => {
      const result = run(
        `request.security("REMOTE:ALT", "2", request.security(${symbol}, ${timeframe}, close), lookahead=barmerge.lookahead_on)`,
      );
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Value').values).toEqual([71, 71, 72, 72, 73, 73]);
    });
  }
  for (const symbol of ['"LOCAL:HOME"', '""']) {
    it(`lower_tf chart symbol ${symbol}`, () => {
      const result = run(`array.get(request.security_lower_tf(${symbol}, "1", close), 0)`, '2');
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Value').values).toEqual([11, 13, 15]);
    });
  }
  for (const symbol of ['"REMOTE:ALT"', '""']) {
    it(`lower_tf requested parent symbol ${symbol}`, () => {
      const result = run(
        `request.security("REMOTE:ALT", "2", array.get(request.security_lower_tf(${symbol}, "1", close), 0), lookahead=barmerge.lookahead_on)`,
      );
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Value').values).toEqual([41, 41, 43, 43, 45, 45]);
    });
  }
});
