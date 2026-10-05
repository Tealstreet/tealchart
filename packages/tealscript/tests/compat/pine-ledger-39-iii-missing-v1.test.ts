import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// var_ta.iii example: ((2 * close - high - low) / (high - low)) * volume.
// The literal -4/4 controls follow that formula; open is not an operand.
describe('documented pointwise III missing values', () => {
  for (const missing of ['high', 'low', 'close', 'volume', 'zero range']) {
    it(`propagates ${missing} and recovers on the next bar`, () => {
      const first: Bar = { time: 1_700_000_000_000, open: Number.NaN, high: 4, low: 0, close: 1, volume: 8 };
      const hole = { ...first, time: first.time + 60_000, open: 1 };
      if (missing === 'zero range') {
        hole.high = 1;
        hole.low = 1;
      } else {
        hole[missing as 'high' | 'low' | 'close' | 'volume'] = Number.NaN;
      }
      const recovered = { ...first, time: first.time + 120_000, open: 3, close: 3 };
      const result = runCompatScript('//@version=6\nindicator("III holes")\nplot(ta.iii, "III")', {
        bars: [first, hole, recovered],
      });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'III').values).toEqual([-4, null, 4]);
    });
  }
});
