import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Ledger1793; preserve separately captured pine-native-conditional-sma-v1 cases.
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#lazy-evaluation-of-conditions
const closes = [3, 1, 7, 2, 5, 4, 9, 1];
const bars = closes.map((close, index) => ({
  time: (index + 1) * 60_000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));

describe('conditional stateful builtin invocation history', () => {
  for (const version of [5, 6]) {
    it(`uses ${version === 6 ? 'skipped' : 'eager'} RHS calls for v${version} logical conditions`, () => {
      const result = runCompatScript(
        `//@version=${version}
indicator("Conditional RSI history")
signal = bar_index % 2 == 0 and ta.rsi(close, 2) > 60
plot(signal ? 1 : 0, "signal")`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'signal').values).toEqual(
        version === 6 ? [0, 0, 0, 0, 1, 0, 1, 0] : [0, 0, 1, 0, 0, 0, 1, 0],
      );
    });
  }

  it('matches invocation-only RSI history while a separate global call sees every bar', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Separate RSI histories")
plot(bar_index % 2 == 0 ? ta.rsi(close, 2) : na, "conditional")
plot(ta.rsi(close, 2), "dense")`,
      { bars },
    );
    const compressed = runCompatScript(
      '//@version=6\nindicator("Invocation reference")\nplot(ta.rsi(close, 2), "reference")',
      { bars: bars.filter((_, index) => index % 2 === 0) },
    );
    const dense = runCompatScript('//@version=6\nindicator("Dense reference")\nplot(ta.rsi(close, 2), "reference")', {
      bars,
    });
    expect([result.errors, compressed.errors, dense.errors]).toEqual([[], [], []]);
    const invoked = getPlot(compressed, 'reference').values;
    expect(getPlot(result, 'conditional').values).toEqual(
      bars.map((_, index) => (index % 2 === 0 ? invoked[index / 2] : null)),
    );
    expect(getPlot(result, 'dense').values).toEqual(getPlot(dense, 'reference').values);
    expect(getPlot(result, 'conditional').values[2]).toBeNull();
    expect(getPlot(result, 'dense').values[2]).toBe(75);
  });
});
