import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/arrays/#joining
const cases = [
  { name: 'empty array', setup: 'array.new<string>(0)', expected: '' },
  { name: 'singleton', setup: 'array.from("A")', expected: 'A' },
  { name: 'empty interior element', setup: 'array.from("A", "", "B")', expected: 'A::::B' },
];

describe('string array join preserves empty elements without endpoint separators', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const item of cases) {
    it(`v${version} ${receiver ? 'receiver' : 'namespace'} ${item.name}`, () => {
      const call = receiver ? 'a.join("::")' : 'array.join(id=a, separator="::")';
      const result = runCompatScript(`//@version=${version}
indicator("String join separator boundaries")
a = ${item.setup}
joined = ${call}
plot(joined == "${item.expected}" ? 1 : 0, "Joined")`, { bars: compatibilityBars.slice(0, 2) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Joined').values).toEqual([1, 1]);
    });
  }
});
