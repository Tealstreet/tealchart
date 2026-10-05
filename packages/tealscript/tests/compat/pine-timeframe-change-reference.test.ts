import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

describe('timeframe.change string overload', () => {
  // Ledger rank738; archived v6 functions[224] permits every string qualifier.
  // https://www.tradingview.com/pine-script-reference/v6/#fun_timeframe.change
  it.each(['"3"', 'input.timeframe("3")', 'timeframe.period', 'bar_index % 2 == 0 ? "6" : "3"'])(
    'accepts timeframe %s and returns series bool',
    (timeframe) => {
      const result = checkProgram(
        parse(`//@version=6\nindicator("Change type")\nchanged = timeframe.change(timeframe=${timeframe})\n`),
      );
      expect(result.diagnostics).toEqual([]);
      expect(result.symbols.find((symbol) => symbol.name === 'changed')?.type).toMatchObject({
        kind: 'bool',
        qualifier: 'series',
      });
    },
  );

  it('uses the supplied timeframe, including its series values', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Change boundaries")
plot(timeframe.change("3") ? 1 : 0, title="Constant")
plot(timeframe.change(timeframe=input.timeframe("3")) ? 1 : 0, title="Input")
plot(timeframe.change(timeframe.isintraday ? "3" : "1D") ? 1 : 0, title="Simple")
plot(timeframe.change(bar_index % 2 == 0 ? "6" : "3") ? 1 : 0, title="Series")
`,
      {
        bars: [60, 120, 180, 240, 300, 360].map((seconds) => ({
          time: Date.UTC(2024, 0, 1) + seconds * 1000,
          open: 10,
          high: 12,
          low: 8,
          close: 11,
          volume: 100,
        })),
        engineOptions: { runtime: { timeframe: { period: '1' } } },
      },
    );
    expect(result.errors).toEqual([]);
    // The first bar has no preceding timestamp; check only observed boundaries.
    for (const title of ['Constant', 'Input', 'Simple'])
      expect(getPlot(result, title).values.slice(1), title).toEqual([0, 1, 0, 0, 1]);
    expect(getPlot(result, 'Series').values.slice(1)).toEqual([0, 0, 0, 0, 1]);
  });

  it('accepts omission and defaults to the chart timeframe', () => {
    const script = `//@version=6\nindicator("Default change")\nplot(timeframe.change() ? 1 : 0, title="Default")\n`;
    expect(checkProgram(parse(script)).diagnostics).toEqual([]);
    const result = runCompatScript(script, {
      bars: [0, 1, 2].map((index) => ({
        time: Date.UTC(2024, 0, 1) + index * 60_000,
        open: 10,
        high: 12,
        low: 8,
        close: 11,
        volume: 100,
      })),
      engineOptions: { runtime: { timeframe: { period: '1' } } },
    });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Default').values.slice(1)).toEqual([1, 1]);
  });
});
