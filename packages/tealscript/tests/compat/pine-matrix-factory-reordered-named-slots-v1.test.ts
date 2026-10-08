import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('matrix factories bind reordered row column and initial_value names', () => {
  const cases = [['int', '-31'], ['float', '-31.25'], ['bool', 'false'], ['string', '"Az"'], ['color', 'color.red']] as const;
  for (const version of [5, 6]) for (const [kind, seed] of cases) {
    it(`v${version} kind=${kind}`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("Named matrix slots")
m = matrix.new<${kind}>(initial_value=${seed}, columns=3, rows=2)
${Array.from({ length: 6 }, (_, i) => `plot(m.get(${Math.floor(i / 3)}, ${i % 3}) == ${seed} ? 1 : 0, "Seed${i}")`).join('\n')}
plot(m.rows(), "Rows")
plot(m.columns(), "Columns")
plot(m.elements_count(), "Elements")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (let i = 0; i < 6; i++) expect(getPlot(result, `Seed${i}`).values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Rows').values).toEqual([2, 2, 2]);
      expect(getPlot(result, 'Columns').values).toEqual([3, 3, 3]);
      expect(getPlot(result, 'Elements').values).toEqual([6, 6, 6]);
    });
  }
});
