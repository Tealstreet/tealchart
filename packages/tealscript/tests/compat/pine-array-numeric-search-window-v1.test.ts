import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('numeric array searches use duplicate endpoints relative to their window', () => {
  for (const version of [5, 6]) for (const method of [false, true]) for (const sliced of [false, true]) {
    it(`v${version} method=${method} slice=${sliced}`, () => {
      const call = (fn: string, value: number) => method ? `a.${fn}(${value})` : `array.${fn}(id=a, value=${value})`;
      const result = runCompatScript(`//@version=${version}
indicator("Numeric window search")
parent = array.from(${sliced ? '97, 5.5, -31.25, 5.5, 17.25, 5.5, -8.25, 5.5, -83' : '-31.25, 5.5, 17.25, 5.5, -8.25'})
a = ${sliced ? 'parent.slice(2, 7)' : 'parent'}
plot(${call('indexof', 5.5)}, "First")
plot(${call('lastindexof', 5.5)}, "Last")
plot(${call('includes', 5.5)} ? 1 : 0, "Present")
plot(${call('indexof', 97)}, "AbsentFirst")
plot(${call('lastindexof', 97)}, "AbsentLast")
plot(${call('includes', 97)} ? 1 : 0, "Absent")
a.set(1, -53.5)
plot(${call('indexof', 5.5)}, "NextFirst")
a.set(3, -67.5)
plot(${call('indexof', 5.5)}, "RemovedFirst")
plot(${call('lastindexof', 5.5)}, "RemovedLast")
plot(${call('includes', 5.5)} ? 1 : 0, "Removed")
plot(a.size(), "Size")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      const expected: Record<string, number> = { First: 1, Last: 3, Present: 1, AbsentFirst: -1, AbsentLast: -1, Absent: 0, NextFirst: 3, RemovedFirst: -1, RemovedLast: -1, Removed: 0, Size: 5 };
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values).toEqual([value, value, value]);
    });
  }
});
