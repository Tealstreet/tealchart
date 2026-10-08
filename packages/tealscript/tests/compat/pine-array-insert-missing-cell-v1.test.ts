import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('array insert retains missing value and shifts all later slots', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} ${receiver ? 'receiver' : 'namespace'}`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("Insert missing slot")
a = array.from(17.0, -8.0, 43.0)
alias = a
${receiver ? 'alias.insert(1, float(na))' : 'array.insert(alias, 1, float(na))'}
${Array.from({ length: 4 }, (_, i) => `plot(array.get(a, ${i}), "Retained${i}")`).join('\n')}
plot(array.size(a), "Size")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      [17, null, -8, 43].forEach((value, i) => expect(getPlot(result, `Retained${i}`).values).toEqual([value, value, value]));
      expect(getPlot(result, 'Size').values).toEqual([4, 4, 4]);
    });
  }
});
