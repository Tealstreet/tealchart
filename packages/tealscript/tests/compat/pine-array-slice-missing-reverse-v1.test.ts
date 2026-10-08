import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('numeric missing slice reversal changes only its parent window', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} receiver=${receiver}`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("Slice missing reverse")
a = array.from(17.0, na, -8.0, 43.0, -31.0, 5.0)
s = array.slice(a, 1, 5)
${receiver ? 's.reverse()' : 'array.reverse(s)'}
${Array.from({ length: 6 }, (_, i) => `plot(array.get(a, ${i}), "Parent${i}")`).join('\n')}
${Array.from({ length: 4 }, (_, i) => `plot(array.get(s, ${i}), "Slice${i}")`).join('\n')}
plot(array.size(a), "ParentSize")
plot(array.size(s), "SliceSize")
${receiver ? 's.reverse()' : 'array.reverse(s)'}
${Array.from({ length: 6 }, (_, i) => `plot(array.get(a, ${i}), "Restored${i}")`).join('\n')}`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      const assertCells = (prefix: string, values: Array<number | null>) => values.forEach((value, i) => expect(getPlot(result, `${prefix}${i}`).values).toEqual([value, value, value]));
      assertCells('Parent', [17, -31, 43, -8, null, 5]);
      assertCells('Slice', [-31, 43, -8, null]);
      assertCells('Restored', [17, null, -8, 43, -31, 5]);
      expect(getPlot(result, 'ParentSize').values).toEqual([6, 6, 6]);
      expect(getPlot(result, 'SliceSize').values).toEqual([4, 4, 4]);
    });
  }
});
