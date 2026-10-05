import { describe, expect, it } from 'vitest';

import type { Bar } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

// Authority: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json
// fun_ta.supertrend and fun_ta.atr examples; ledger gaps812/814.
// Known prior high/close make both ATR authorities agree; no next-bar pin.
const firstBar: Bar = { time: 60_000, open: 10, high: 13, low: 8, close: 10, volume: 100 };

describe('ledger gaps 21: Supertrend missing current close (812/814)', () => {
  it('uses current range and prior close when current close is unavailable', () => {
    for (const close of [Number.NaN, 11]) {
      const secondBar: Bar = { time: 120_000, open: 11, high: 12, low: 9, close, volume: 120 };
      const result = runCompatScript('[line, direction] = ta.supertrend(2, 1)\nplot(line, "Line")\nplot(direction, "Direction")', { bars: [firstBar, secondBar] });
      expect.soft(result.errors).toEqual([]);
      expect.soft(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      // TR=max(3, abs(12-10), abs(9-10))=3; upper=10.5+2*3=16.5.
      expect.soft(getPlot(result, 'Line').values[1]).toBe(16.5);
      expect.soft(getPlot(result, 'Direction').values[1]).toBe(1);
    }
  });
});
