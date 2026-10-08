import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Official ta.median integer/float overloads: median of the current source window.
describe('Median uses each current odd window across repeated length changes', () => {
  for (const kind of ['int', 'float']) {
    it(`${kind} retains literal median values at every observed bar`, () => {
      const bars = [7, -2, 9, -2, 4, 0, 11, -5, 3, 8].map((close, index) => ({
        time: 1700000000000 + index * 60000,
        open: close,
        high: close + 1,
        low: close - 1,
        close,
        volume: 10,
      }));
      const source = kind === 'int' ? 'int(close)' : 'close / 2.0';
      const call = kind === 'int' ? 'ta.median(source=source, length=length)' : 'ta.median(source, length)';
      const result = runCompatScript(
        `//@version=6
indicator("Changing median windows")
source = ${source}
length = bar_index % 2 == 0 ? 3 : 5
plot(${call}, "Median")`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      const scale = kind === 'int' ? 1 : 0.5;
      expect(getPlot(result, 'Median').values.slice(4)).toEqual([4, 0, 4, 0, 3, 3].map((value) => value * scale));
    });
  }
});
