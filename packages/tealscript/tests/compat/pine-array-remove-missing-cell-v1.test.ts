import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('array remove returns a missing slot and shifts every later element', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} ${receiver ? 'receiver' : 'namespace'}`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("Remove missing slot")
a = array.from(17.0, float(na), -8.0, 43.0)
alias = a
removed = ${receiver ? 'alias.remove(1)' : 'array.remove(alias, 1)'}
plot(removed, "Removed")
plot(na(removed) ? 1 : 0, "RemovedMissing")
${Array.from({ length: 3 }, (_, i) => `plot(array.get(a, ${i}), "Retained${i}")`).join('\n')}
plot(array.size(a), "Size")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Removed').values).toEqual([null, null, null]);
      expect(getPlot(result, 'RemovedMissing').values).toEqual([1, 1, 1]);
      [17, -8, 43].forEach((value, i) => expect(getPlot(result, `Retained${i}`).values).toEqual([value, value, value]));
      expect(getPlot(result, 'Size').values).toEqual([3, 3, 3]);
    });
  }
});
