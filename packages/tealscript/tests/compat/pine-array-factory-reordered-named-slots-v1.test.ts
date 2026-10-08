import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('array factories bind reordered size and initial_value names', () => {
  const cases = [['int', '-31'], ['float', '-31.25'], ['bool', 'false'], ['string', '"Az"'], ['color', 'color.red']] as const;
  for (const version of [5, 6]) for (const generic of [false, true]) for (const [kind, seed] of cases) {
    it(`v${version} generic=${generic} kind=${kind}`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("Named factory slots")
a = ${generic ? `array.new<${kind}>` : `array.new_${kind}`}(initial_value=${seed}, size=3)
${Array.from({ length: 3 }, (_, i) => `plot(a.get(${i}) == ${seed} ? 1 : 0, "Seed${i}")`).join('\n')}
plot(a.size(), "Size")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const title of ['Seed0', 'Seed1', 'Seed2']) expect(getPlot(result, title).values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Size').values).toEqual([3, 3, 3]);
    });
  }
});
