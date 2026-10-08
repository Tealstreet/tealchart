import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('array clear empties front insertions before refilling', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} ${receiver ? 'receiver' : 'namespace'}`, () => {
      const clear = receiver ? 'alias.clear()' : 'array.clear(alias)';
      const result = runCompatScript(`//@version=${version}
indicator("Clear front and refill")
a = array.new_int(2, 17)
alias = a
array.unshift(a, -8)
array.unshift(a, 43)
plot(array.size(a), "Before")
${clear}
plot(array.size(a), "Empty")
array.push(a, -31)
array.unshift(a, 5)
plot(array.size(alias), "Refilled")
plot(array.get(alias, 0), "First")
plot(array.get(alias, 1), "Last")
${clear}
plot(array.size(a), "EmptyAgain")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const [title, value] of Object.entries({ Before: 4, Empty: 0, Refilled: 2, First: 5, Last: -31, EmptyAgain: 0 })) {
        expect(getPlot(result, title).values).toEqual([value, value, value]);
      }
    });
  }
});
