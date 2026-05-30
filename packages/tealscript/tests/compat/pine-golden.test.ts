import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, roundSeries, runCompatScript } from './fixtures';

describe('Pine compatibility golden harness', () => {
  it('runs a minimal plotted indicator against deterministic bars', () => {
    const result = runCompatScript(`
indicator("Golden SMA", overlay=true)
length = input.int(3, "Length")
basis = ta.sma(close, length)
plot(basis, title="Basis", color=color.blue)
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorTitle).toBe('Golden SMA');
    expect(result.inputs).toEqual([
      {
        id: 'input_Length',
        type: 'int',
        title: 'Length',
        defval: 3,
      },
    ]);

    const basis = getPlot(result, 'Basis');
    expect(basis.values).toHaveLength(compatibilityBars.length);
    expect(roundSeries(basis.values)).toEqual([null, null, 104.666667, 105, 103, 100.666667, 101, 104.333333, 107, 109.333333, 109.666667, 111]);
  });
});
