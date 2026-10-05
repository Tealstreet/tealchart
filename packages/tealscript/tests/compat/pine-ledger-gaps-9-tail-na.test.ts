import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

describe('ledger gaps 9: documented block tails and ignored NA', () => {
  it('returns nested conditional and switch tails from the selected switch arm', () => {
    // Rank322: language-grammar-v1#165; reference/pine-v6-reference-v1.json keyword:switch.
    // https://www.tradingview.com/pine-script-docs/language/conditional-structures/#switch-structure
    const result = runCompatScript(`//@version=6
indicator("nested switch returns")
f(int n) =>
    switch n % 3
        0 =>
            int base = 10
            if n % 2 == 0
                base + n
            else
                -base - n
        1 =>
            int base = 20
            switch n % 2
                0 => base + n
                => -base - n
        =>
            int base = 30
            if n % 2 == 0
                base + n
            else
                -base - n
plot(f(bar_index), "selected")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'selected').values).toEqual([10, -21, 32, -13, 24, -35, 16, -27, 38, -19, 30, -41]);
  });

  it('ignores an NA source inside a lowest window without assuming a window horizon', () => {
    // Rank329: series-history-na-v3#146; reference/pine-v6-reference-v1.json functions[181].
    // https://www.tradingview.com/pine-script-reference/v6/#fun_ta.lowest
    const result = runCompatScript(`//@version=6
indicator("lowest ignores NA")
source = bar_index == 10 ? na : 100.0
plot(ta.lowest(source, 3), "minimum")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'minimum').values.at(-1)).toBe(100);
  });
});
