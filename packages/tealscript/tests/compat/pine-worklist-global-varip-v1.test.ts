import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Ledger1667: global historical varip has the persistence of var.
// https://www.tradingview.com/pine-script-docs/language/variable-declarations/
describe('global varip historical persistence', () => {
  for (const version of [5, 6]) {
    it(`initializes once and accumulates across historical bars in v${version}`, () => {
      const result = runCompatScript(
        `//@version=${version}
indicator("Historical persistence")
var int ordinary = bar_index + 7
varip int intrabar = bar_index + 7
int ephemeral = bar_index + 7
ordinary += bar_index + 1
intrabar += bar_index + 1
ephemeral += bar_index + 1
plot(ordinary, "var")
plot(intrabar, "varip")
plot(ephemeral, "regular")`,
        {
          bars: Array.from({ length: 6 }, (_, index) => ({
            time: (index + 1) * 60_000,
            open: 1,
            high: 1,
            low: 1,
            close: 1,
            volume: 1,
          })),
        },
      );
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'var').values).toEqual([8, 10, 13, 17, 22, 28]);
      expect(getPlot(result, 'varip').values).toEqual([8, 10, 13, 17, 22, 28]);
      expect(getPlot(result, 'regular').values).toEqual([8, 10, 12, 14, 16, 18]);
    });
  }
});
