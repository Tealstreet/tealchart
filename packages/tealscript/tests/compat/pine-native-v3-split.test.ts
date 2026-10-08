import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: https://www.tradingview.com/pine-script-reference/v6/, fun_str.split.
describe('native empty-separator split', () => {
  it('matches captured empty and nonempty source split sizes', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Native split")
a = str.split("", "")
b = str.split("abc", "")
plot(array.size(a), "Empty size")
plot(array.size(b), "ABC size")
`,
      { bars: compatibilityBars.slice(0, 1) },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Empty size').values).toEqual([1]);
    expect(getPlot(result, 'ABC size').values).toEqual([3]);
  });
});
