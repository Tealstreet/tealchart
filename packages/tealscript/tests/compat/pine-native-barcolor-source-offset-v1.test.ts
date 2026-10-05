import { describe, expect, it } from 'vitest';

import { compatibilityBars, runCompatScript } from './fixtures';

// Native v7 v4/v5 captures retain red on destinations missing from a per-source-offset model.
describe('Captured historical barcolor final offset', () => {
  it.each([4, 5])('retains all source colors and the final offset in v%s', (version) => {
    const bars = compatibilityBars
      .slice(0, 8)
      .map((bar, index) => ({ ...bar, close: bar.open + (index % 2 === 0 ? 1 : -1) }));
    const result = runCompatScript(
      `//@version=${version}
study("Barcolor final offset")
o = close > open ? 1 : -1
barcolor(color.red, offset=o)`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    const plot = result.plots.find((p) => p.type === 'barcolor')!;
    expect(plot.offset).toBe(-1);
    expect(plot.color).toEqual(Array(8).fill('#FF5252'));
  });
});
