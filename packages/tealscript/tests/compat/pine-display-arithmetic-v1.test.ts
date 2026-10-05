import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Visual ledger rows104/107/110/113/116/119 document display flag arithmetic.
// These witnesses certify runtime masks, independent of host Style/reset UI.
describe('documented display flag arithmetic', () => {
  for (const [flag, value] of [
    ['pane', 1],
    ['data_window', 2],
    ['price_scale', 8],
    ['status_line', 4],
    ['pine_screener', 16],
    ['all', 31],
  ] as const) {
    it(`carries addition and subtraction of display.${flag} into plot masks`, () => {
      const result = runCompatScript(`//@version=6
indicator("Display masks")
plot(close, "Added", display=display.none + display.${flag})
plot(close, "Removed", display=display.all - display.${flag})
plot(close, "Combined", display=(display.none + display.${flag}) + (display.all - display.${flag}))
`);
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Added').display).toBe(value);
      expect(getPlot(result, 'Removed').display).toBe(31 - value);
      expect(getPlot(result, 'Combined').display).toBe(31);
    });
  }
});
