import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('color matrix factory fills every rectangular cell', () => {
  for (const version of [5, 6]) for (const seed of ['color.red', 'color.blue']) {
    it(`v${version} seed=${seed}`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("Color matrix seeds")
m = matrix.new<color>(2, 3, ${seed})
${Array.from({ length: 6 }, (_, i) => `plot(m.get(${Math.floor(i / 3)}, ${i % 3}) == ${seed} ? 1 : 0, "Seed${i}")`).join('\n')}
m.set(1, 1, color.green)
${Array.from({ length: 6 }, (_, i) => `plot(m.get(${Math.floor(i / 3)}, ${i % 3}) == ${i === 4 ? 'color.green' : seed} ? 1 : 0, "After${i}")`).join('\n')}
plot(m.rows(), "Rows")
plot(m.columns(), "Columns")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (let i = 0; i < 6; i++) for (const prefix of ['Seed', 'After']) expect(getPlot(result, `${prefix}${i}`).values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Rows').values).toEqual([2, 2, 2]);
      expect(getPlot(result, 'Columns').values).toEqual([3, 3, 3]);
    });
  }
});
