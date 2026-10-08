import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('specialized and generic color array factories fill every requested cell', () => {
  for (const version of [5, 6]) for (const generic of [false, true]) for (const seed of ['color.red', 'color.blue']) {
    it(`v${version} generic=${generic} seed=${seed}`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("Color factory all cells")
a = ${generic ? 'array.new<color>' : 'array.new_color'}(3, ${seed})
${Array.from({ length: 3 }, (_, i) => `plot(array.get(a, ${i}) == ${seed} ? 1 : 0, "Seed${i}")`).join('\n')}
a.set(1, color.green)
plot(a.get(0) == ${seed} ? 1 : 0, "FirstRetained")
plot(a.get(1) == color.green ? 1 : 0, "MiddleChanged")
plot(a.get(2) == ${seed} ? 1 : 0, "LastRetained")
plot(a.size(), "Size")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const title of ['Seed0', 'Seed1', 'Seed2', 'FirstRetained', 'MiddleChanged', 'LastRetained']) expect(getPlot(result, title).values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Size').values).toEqual([3, 3, 3]);
    });
  }
});
