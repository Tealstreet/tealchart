import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('matrix axis arrays retain missing slots and independent value storage', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const column of [false, true]) {
    it(`v${version} receiver=${receiver} column=${column}`, () => {
      const member = column ? 'col' : 'row';
      const index = column ? 1 : 0;
      const expected = column ? [null, 43, -31] : [17, null];
      const result = runCompatScript(`//@version=${version}
indicator("Axis missing storage")
m = matrix.new<float>(3, 2, na)
${[17, null, -8, 43, 5, -31].map((value, i) => value === null ? '' : `matrix.set(m, ${Math.floor(i / 2)}, ${i % 2}, ${value})`).join('\n')}
a = ${receiver ? `m.${member}(${index})` : `matrix.${member}(m, ${index})`}
${expected.map((_, i) => `plot(array.get(a, ${i}), "Initial${i}")`).join('\n')}
array.set(a, ${column ? 0 : 1}, 29)
matrix.set(m, ${column ? '2, 1' : '0, 0'}, 71)
plot(matrix.get(m, 0, 1), "OriginalMissing")
plot(array.get(a, ${column ? 2 : 0}), "CopiedRetained")
plot(array.size(a), "Size")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      expected.forEach((value, i) => expect(getPlot(result, `Initial${i}`).values).toEqual([value, value, value]));
      expect(getPlot(result, 'OriginalMissing').values).toEqual([null, null, null]);
      const retained = column ? -31 : 17;
      expect(getPlot(result, 'CopiedRetained').values).toEqual([retained, retained, retained]);
      expect(getPlot(result, 'Size').values).toEqual([expected.length, expected.length, expected.length]);
    });
  }
});
