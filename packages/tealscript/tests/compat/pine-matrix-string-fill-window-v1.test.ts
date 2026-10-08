import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('matrix string fill includes empty values only inside its half-open rectangle', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} receiver=${receiver}`, () => {
      const cells = Array.from({ length: 20 }, (_, i) => `cell${i}`);
      const lines = cells.map((value, i) => `m.set(${Math.floor(i / 5)}, ${i % 5}, "${value}")`);
      for (const [stage, seed] of [['Empty', ''], ['Text', 'Az']] as const) {
        lines.push(receiver ? `m.fill("${seed}", 1, 3, 1, 4)` : `matrix.fill(to_column=4, value="${seed}", from_row=1, id=m, to_row=3, from_column=1)`);
        cells.forEach((value, i) => {
          const row = Math.floor(i / 5), column = i % 5;
          const expected = row >= 1 && row < 3 && column >= 1 && column < 4 ? seed : value;
          lines.push(`plot(m.get(${row}, ${column}) == "${expected}" ? 1 : 0, "${stage}${i}")`);
        });
      }
      const result = runCompatScript(`//@version=${version}\nindicator("String matrix fill window")\nm = matrix.new<string>(4, 5, "")\n${lines.join('\n')}\nplot(m.rows(), "Rows")\nplot(m.columns(), "Columns")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const stage of ['Empty', 'Text']) for (let i = 0; i < 20; i++) expect(getPlot(result, `${stage}${i}`).values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Rows').values).toEqual([4, 4, 4]);
      expect(getPlot(result, 'Columns').values).toEqual([5, 5, 5]);
    });
  }
});
