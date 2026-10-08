import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Official ta.mode integer/float overloads: highest frequency, smallest tie value.
describe('Mode uses each current window across repeated length changes', () => {
  for (const kind of ['int', 'float']) {
    it(`${kind} retains literal modal values at every observed bar`, () => {
      const bars = [3, 1, 3, 1, 7, 7, -2, -2, 7, -2].map((close, index) => ({
        time: 1700000000000 + index * 60000,
        open: close,
        high: close + 1,
        low: close - 1,
        close,
        volume: 10,
      }));
      const source = kind === 'int' ? 'int(close)' : 'close / 2.0';
      const call = kind === 'int' ? 'ta.mode(source=source, length=length)' : 'ta.mode(source, length)';
      const result = runCompatScript(
        `//@version=6
indicator("Changing mode windows")
source = ${source}
length = bar_index % 2 == 0 ? 3 : 4
plot(${call}, "Mode")`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      const scale = kind === 'int' ? 1 : 0.5;
      expect(getPlot(result, 'Mode').values.slice(4)).toEqual([1, 7, 7, -2, -2, -2].map((value) => value * scale));
    });
  }
});
