import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Official ta.range integer/float overloads: maximum minus minimum.
describe('Range uses each current window across repeated shrink and expansion', () => {
  for (const kind of ['int', 'float']) {
    it(`${kind} retains literal range values at every observed bar`, () => {
      const bars = [7, -2, 9, -2, 4, 0, 11, -5, 3, 8].map((close, index) => ({
        time: 1700000000000 + index * 60000,
        open: close,
        high: close + 1,
        low: close - 1,
        close,
        volume: 10,
      }));
      const source = kind === 'int' ? 'int(close)' : 'close / 2.0';
      const call = kind === 'int' ? 'ta.range(source=source, length=length)' : 'ta.range(source, length)';
      const result = runCompatScript(
        `//@version=6
indicator("Changing range windows")
source = ${source}
length = bar_index % 3 == 0 ? 1 : bar_index % 3 == 1 ? 3 : 4
plot(${call}, "Range")`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      const scale = kind === 'int' ? 1 : 0.5;
      expect(getPlot(result, 'Range').values.slice(4)).toEqual([11, 11, 0, 16, 16, 0].map((value) => value * scale));
    });
  }
});
