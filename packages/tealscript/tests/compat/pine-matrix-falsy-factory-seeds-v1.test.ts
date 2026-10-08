import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('matrix factories retain explicitly supplied falsy seeds', () => {
  for (const version of [5, 6]) for (const generic of [false, true]) for (const named of [false, true]) {
    for (const [kind, seed] of [['int', '0'], ['float', '0.0'], ['string', '""']]) {
      it(`v${version} generic=${generic} named=${named} kind=${kind}`, () => {
        const constructor = generic ? `matrix.new<${kind}>` : `matrix.new_${kind}`;
        const result = runCompatScript(`//@version=${version}
indicator("Falsy matrix seeds")
m = ${constructor}(${named ? `initial_value=${seed}, columns=3, rows=2` : `2, 3, ${seed}`})
${Array.from({ length: 6 }, (_, i) => `plot(m.get(${Math.floor(i / 3)}, ${i % 3}) == ${seed} ? 1 : 0, "Cell${i}")`).join('\n')}
plot(m.rows(), "Rows")
plot(m.columns(), "Columns")
plot(m.elements_count(), "Elements")`, { bars: compatibilityBars.slice(0, 3) });
        expect(result.errors).toEqual([]);
        for (let i = 0; i < 6; i++) expect(getPlot(result, `Cell${i}`).values).toEqual([1, 1, 1]);
        expect(getPlot(result, 'Rows').values).toEqual([2, 2, 2]);
        expect(getPlot(result, 'Columns').values).toEqual([3, 3, 3]);
        expect(getPlot(result, 'Elements').values).toEqual([6, 6, 6]);
      });
    }
  }
});
