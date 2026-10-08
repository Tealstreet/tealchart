import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('string array factories retain supplied empty and mixed-case seeds', () => {
  for (const version of [5, 6]) for (const generic of [false, true]) for (const seed of ['', 'Az']) {
    it(`v${version} generic=${generic} seed=${JSON.stringify(seed)}`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("String factory explicit seeds")
a = ${generic ? 'array.new<string>' : 'array.new_string'}(3, ${JSON.stringify(seed)})
${Array.from({ length: 3 }, (_, i) => `plot(array.get(a, ${i}) == ${JSON.stringify(seed)} ? 1 : 0, "Seed${i}")`).join('\n')}
a.set(1, "B")
plot(a.get(0) == ${JSON.stringify(seed)} ? 1 : 0, "FirstRetained")
plot(a.get(1) == "B" ? 1 : 0, "MiddleChanged")
plot(a.get(2) == ${JSON.stringify(seed)} ? 1 : 0, "LastRetained")
plot(a.size(), "Size")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const title of ['Seed0', 'Seed1', 'Seed2', 'FirstRetained', 'MiddleChanged', 'LastRetained']) expect(getPlot(result, title).values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Size').values).toEqual([3, 3, 3]);
    });
  }
});
