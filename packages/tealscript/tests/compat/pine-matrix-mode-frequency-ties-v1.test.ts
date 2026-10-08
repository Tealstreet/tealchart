import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('rectangular matrix mode resolves frequency ties to the smallest value', () => {
  for (const version of [5, 6]) for (const method of [false, true]) {
    it(`v${version} method=${method}`, () => {
      const cases = [[43, -8, 43, -8, 17, 5], [-31, 43, 17, 43, 5, 43], [43, 17, -8, 5, 29, -31]];
      const result = runCompatScript(`//@version=${version}
indicator("Matrix frequency ties")
${cases.map((values, c) => `m${c} = matrix.new<int>(2, 3, 0)\n${values.map((v, i) => `m${c}.set(${Math.floor(i / 3)}, ${i % 3}, ${v})`).join('\n')}\nplot(${method ? `m${c}.mode()` : `matrix.mode(id=m${c})`}, "Mode${c}")\n${values.map((_, i) => `plot(m${c}.get(${Math.floor(i / 3)}, ${i % 3}), "Source${c}_${i}")`).join('\n')}`).join('\n')}`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      [-8, 43, -31].forEach((value, i) => expect(getPlot(result, `Mode${i}`).values).toEqual([value, value, value]));
      cases.forEach((values, c) => values.forEach((value, i) => expect(getPlot(result, `Source${c}_${i}`).values).toEqual([value, value, value])));
    });
  }
});
