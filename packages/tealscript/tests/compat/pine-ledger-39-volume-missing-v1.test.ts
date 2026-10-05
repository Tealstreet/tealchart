import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Reference NVI/PVI examples hold when current/prior close is missing.
// NVI compares current volume with nz(volume[1], 0), so a prior hole holds.
const bars = (closes: number[], volumes: number[]): Bar[] =>
  closes.map((close, i) => ({
    time: 1_700_000_000_000 + i * 60_000,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: volumes[i],
  }));

describe('documented volume index missing-bar guards', () => {
  it('holds NVI across current and prior missing volume without using stale volume', () => {
    const result = runCompatScript('//@version=6\nindicator("NVI volume hole")\nplot(ta.nvi, "Index")', {
      bars: bars([10, 12, 9, 18], [300, Number.NaN, 50, 25]),
    });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Index').values).toEqual([1, 1, 1, 2]);
  });

  for (const name of ['nvi', 'pvi']) {
    it(`holds ${name} across current and prior missing close, then resumes from the held index`, () => {
      const result = runCompatScript(`//@version=6\nindicator("Volume close hole")\nplot(ta.${name}, "Index")`, {
        bars: bars([10, 12, Number.NaN, 9, 18], name === 'nvi' ? [300, 200, 100, 50, 25] : [100, 200, 300, 400, 500]),
      });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Index').values).toEqual([1, 1.2, 1.2, 1.2, 2.4]);
    });
  }
});
