import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('string array copies preserve case and empty slots with independent storage', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} receiver=${receiver}`, () => {
      const checks = (name: string, values: string[]) => values.map((value, i) => `plot(array.get(${name}, ${i}) == ${JSON.stringify(value)} ? 1 : 0, "${name}${i}")`).join('\n');
      const result = runCompatScript(`//@version=${version}
indicator("String copy isolation")
a = array.from("Az", "", "a")
c = ${receiver ? 'a.copy()' : 'array.copy(id=a)'}
c.set(1, "B")
a.set(0, "Z")
c.push("tail")
${checks('a', ['Z', '', 'a'])}
${checks('c', ['Az', 'B', 'a', 'tail'])}
plot(array.size(a), "OriginalSize")
plot(array.size(c), "CopySize")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const [name, size] of [['a', 3], ['c', 4]] as const) for (let i = 0; i < size; i++) expect(getPlot(result, `${name}${i}`).values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'OriginalSize').values).toEqual([3, 3, 3]);
      expect(getPlot(result, 'CopySize').values).toEqual([4, 4, 4]);
    });
  }
});
