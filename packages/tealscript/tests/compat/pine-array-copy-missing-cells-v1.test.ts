import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('array copies preserve missing positions and independent buffers', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} ${receiver ? 'receiver' : 'namespace'}`, () => {
      const source = `//@version=${version}
indicator("Array copy missing cells")
a = array.from(17.0, float(na), -8.0)
b = ${receiver ? 'a.copy()' : 'array.copy(a)'}
${Array.from({ length: 3 }, (_, i) => `plot(array.get(b, ${i}), "Initial${i}")`).join('\n')}
array.set(b, 1, 43)
array.set(a, 0, -31)
array.push(b, 5)
${Array.from({ length: 3 }, (_, i) => `plot(array.get(a, ${i}), "Original${i}")`).join('\n')}
${Array.from({ length: 4 }, (_, i) => `plot(array.get(b, ${i}), "Copied${i}")`).join('\n')}
plot(array.size(a), "OriginalSize")
plot(array.size(b), "CopiedSize")`;
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const [prefix, values] of [['Initial', [17, null, -8]], ['Original', [-31, null, -8]], ['Copied', [17, 43, -8, 5]]] as const) {
        values.forEach((value, index) => expect(getPlot(result, `${prefix}${index}`).values).toEqual([value, value, value]));
      }
      expect(getPlot(result, 'OriginalSize').values).toEqual([3, 3, 3]);
      expect(getPlot(result, 'CopiedSize').values).toEqual([4, 4, 4]);
    });
  }
});
