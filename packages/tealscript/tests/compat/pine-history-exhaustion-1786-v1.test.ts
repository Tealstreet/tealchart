import { describe, expect, it } from 'vitest';

import { HistoryBufferSizing } from '../../src/runtime/codegen/history';

// The bounded kernel witness does not assert TradingView's private retry count.
// https://www.tradingview.com/pine-script-docs/language/execution-model/#historical-buffers
describe('rank1786 terminal history sizing exhaustion', () => {
  it('collects independent growth in one replay instead of exhausting the retry budget', () => {
    const history = new HistoryBufferSizing();
    const keys = Array.from({ length: 201 }, (_, index) => `series-${index}`);
    let attempts = 0;
    const result = history.run(() => {
      attempts += 1;
      for (const key of keys) history.check(key, 2, false, 1);
      return 'completed';
    });
    expect(result).toBe('completed');
    expect(attempts).toBe(2);
  });

  it('surfaces exhaustion when recovered values reveal a new dependent lookback on each pass', () => {
    const history = new HistoryBufferSizing();
    let attempts = 0;
    expect(() =>
      history.run(() => {
        attempts++;
        history.beginBar(244, false);
        const deps = history.dependencies(1, () => false);
        for (let key = 0; key < 201; key++) {
          const series = new deps.NumericSeries(2, 1, `dependent:${key}`);
          for (let index = 0; index < 3; index++) series.push(index);
          if (Number.isNaN(series.get(2))) return 'provisional';
        }
        return 'completed';
      }),
    ).toThrow(/Historical offset 2 exceeds max_bars_back 1/);
    expect(attempts).toBe(101);
  });

  it('completes the same independent references when the buffers are preallocated', () => {
    const history = new HistoryBufferSizing(2);
    let attempts = 0;
    const result = history.run(() => {
      attempts += 1;
      for (let index = 0; index < 201; index += 1) history.check(`series-${index}`, 2, false, 1);
      return 'completed';
    });
    expect(result).toBe('completed');
    expect(attempts).toBe(1);
  });
});
