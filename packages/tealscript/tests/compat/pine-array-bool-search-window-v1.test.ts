import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('bool array searches use duplicate endpoints relative to their window', () => {
  for (const version of [5, 6]) for (const method of [false, true]) for (const sliced of [false, true]) {
    it(`v${version} method=${method} slice=${sliced}`, () => {
      const call = (fn: string, value: boolean) => method ? `a.${fn}(${value})` : `array.${fn}(id=a, value=${value})`;
      const result = runCompatScript(`//@version=${version}
indicator("Bool window search")
parent = array.from(${sliced ? 'false, true, false, true, false, true, false' : 'true, false, true, false, true'})
a = ${sliced ? 'parent.slice(1, 6)' : 'parent'}
plot(${call('indexof', false)}, "First")
plot(${call('lastindexof', false)}, "Last")
plot(${call('includes', false)} ? 1 : 0, "Present")
a.set(1, true)
plot(${call('indexof', false)}, "NextFirst")
a.set(3, true)
plot(${call('indexof', false)}, "RemovedFirst")
plot(${call('lastindexof', false)}, "RemovedLast")
plot(${call('includes', false)} ? 1 : 0, "Removed")
plot(a.size(), "Size")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      const expected: Record<string, number> = { First: 1, Last: 3, Present: 1, NextFirst: 3, RemovedFirst: -1, RemovedLast: -1, Removed: 0, Size: 5 };
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values).toEqual([value, value, value]);
    });
  }
});
