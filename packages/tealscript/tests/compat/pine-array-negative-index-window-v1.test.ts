import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('v6 negative indices use current selected-window size through insertion and removal', () => {
  for (const receiver of [false, true]) for (const sliced of [false, true]) {
    it(`receiver=${receiver} sliced=${sliced}`, () => {
      const call = (member: string, args: string) => receiver ? `a.${member}(${args})` : `array.${member}(a, ${args})`;
      const result = runCompatScript(`//@version=6
indicator("Negative window indices")
parent = array.from(${sliced ? '97, -31, 5, 17, -8, 43, -83' : '-31, 5, 17, -8, 43'})
a = ${sliced ? 'parent.slice(1, 6)' : 'parent'}
plot(${call('get', '-a.size()')}, "First")
plot(${call('get', '-1')}, "Last")
${call('set', '-2, 29')}
${call('insert', '-1, -47')}
plot(a.size(), "InsertedSize")
plot(${call('remove', '-a.size()')}, "Removed")
${[5, 17, 29, -47, 43].map((_, i) => `plot(${call('get', String(i - 5))}, "Cell${i}")`).join('\n')}
plot(a.size(), "Size")
${sliced ? 'plot(parent.get(0), "Before")\nplot(parent.get(parent.size()-1), "After")' : ''}`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      const expected: Record<string, number> = { First: -31, Last: 43, InsertedSize: 6, Removed: -31, Size: 5 };
      [5, 17, 29, -47, 43].forEach((value, i) => { expected[`Cell${i}`] = value; });
      if (sliced) { expected.Before = 97; expected.After = -83; }
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values).toEqual(Array(3).fill(value));
    });
  }
});
