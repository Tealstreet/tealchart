import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('string matrix swaps preserve every distinct slot', () => {
  const cells = ['Az', '', 'a', 'B', 'Z', 'first'];
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const rows of [false, true]) {
    it(`v${version} receiver=${receiver} rows=${rows}`, () => {
      const height = rows ? 3 : 2, width = rows ? 2 : 3;
      const method = rows ? 'swap_rows' : 'swap_columns';
      const expected = rows ? ['Z', 'first', 'a', 'B', 'Az', ''] : ['a', '', 'Az', 'first', 'Z', 'B'];
      const call = (a: number, b: number) => receiver ? `m.${method}(${a}, ${b})` : `matrix.${method}(m, ${a}, ${b})`;
      const result = runCompatScript(`//@version=${version}
indicator("String axis swap")
m = matrix.new<string>(${height}, ${width}, "")
${cells.map((v, i) => `m.set(${Math.floor(i / width)}, ${i % width}, "${v}")`).join('\n')}
${call(0, 2)}
${expected.map((v, i) => `plot(m.get(${Math.floor(i / width)}, ${i % width}) == "${v}" ? 1 : 0, "Cell${i}")`).join('\n')}
${call(1, 1)}
${expected.map((v, i) => `plot(m.get(${Math.floor(i / width)}, ${i % width}) == "${v}" ? 1 : 0, "Self${i}")`).join('\n')}
plot(m.rows(), "Rows")
plot(m.columns(), "Columns")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (let i = 0; i < 6; i++) for (const prefix of ['Cell', 'Self']) expect(getPlot(result, `${prefix}${i}`).values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Rows').values).toEqual([height, height, height]);
      expect(getPlot(result, 'Columns').values).toEqual([width, width, width]);
    });
  }
});
