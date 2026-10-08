import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('numeric array factories retain explicit zero and negative seeds', () => {
  for (const version of [5, 6]) for (const generic of [false, true]) for (const kind of ['int', 'float']) for (const zero of [false, true]) {
    it(`v${version} generic=${generic} kind=${kind} zero=${zero}`, () => {
      const seed = zero ? 0 : kind === 'int' ? -31 : -31.25;
      const replacement = kind === 'int' ? 5 : 5.5;
      const result = runCompatScript(`//@version=${version}
indicator("Numeric explicit seeds")
a = ${generic ? `array.new<${kind}>` : `array.new_${kind}`}(3, ${seed})
plot(a.get(0), "Seed0")
plot(a.get(1), "Seed1")
plot(a.get(2), "Seed2")
a.set(1, ${replacement})
plot(a.get(0), "First")
plot(a.get(1), "Middle")
plot(a.get(2), "Last")
plot(a.size(), "Size")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const title of ['Seed0', 'Seed1', 'Seed2', 'First', 'Last']) expect(getPlot(result, title).values).toEqual([seed, seed, seed]);
      expect(getPlot(result, 'Middle').values).toEqual([replacement, replacement, replacement]);
      expect(getPlot(result, 'Size').values).toEqual([3, 3, 3]);
    });
  }
});
