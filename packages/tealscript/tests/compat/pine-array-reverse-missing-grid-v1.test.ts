import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('array reverse retains odd middle and missing slots', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} ${receiver ? 'receiver' : 'namespace'}`, () => {
      const call = receiver ? 'alias.reverse()' : 'array.reverse(alias)';
      const source = `//@version=${version}
indicator("Array reverse missing slots")
a = array.from(17.0, float(na), -8.0, 43.0, -31.0)
alias = a
${call}
${Array.from({ length: 5 }, (_, i) => `plot(array.get(a, ${i}), "Reversed${i}")`).join('\n')}
${call}
${Array.from({ length: 5 }, (_, i) => `plot(array.get(a, ${i}), "Restored${i}")`).join('\n')}
plot(array.size(a), "Size")`;
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const [prefix, values] of [['Reversed', [-31, 43, -8, null, 17]], ['Restored', [17, null, -8, 43, -31]]] as const) {
        values.forEach((value, index) => expect(getPlot(result, `${prefix}${index}`).values).toEqual([value, value, value]));
      }
      expect(getPlot(result, 'Size').values).toEqual([5, 5, 5]);
    });
  }
});
