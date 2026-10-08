import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('array mode selects smallest frequency ties rather than first or minimum always', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const sliced of [false, true]) {
    it(`v${version} receiver=${receiver} sliced=${sliced}`, () => {
      const sets = [[43, -8, 43, -8, 17], [43, 17, -8], [-31, 43, 17, 43]];
      const result = runCompatScript(`//@version=${version}
indicator("Mode frequency ties")
${sets.map((values, i) => `${sliced ? `p${i} = array.from(97.0, ${values.map(v => `${v}.0`).join(', ')}, -83.0)\na${i} = array.slice(p${i}, 1, ${values.length + 1})` : `a${i} = array.from(${values.map(v => `${v}.0`).join(', ')})`}\nplot(${receiver ? `a${i}.mode()` : `array.mode(id=a${i})`}, "Mode${i}")`).join('\n')}
${sets.flatMap((values, a) => values.map((_, i) => `plot(array.get(a${a}, ${i}), "Cell${a}_${i}")`)).join('\n')}`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      [-8, -8, 43].forEach((value, i) => expect(getPlot(result, `Mode${i}`).values).toEqual([value, value, value]));
      sets.forEach((values, a) => values.forEach((value, i) => expect(getPlot(result, `Cell${a}_${i}`).values).toEqual([value, value, value])));
    });
  }
});
