import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('bool array some and every inspect all nonempty cells', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} receiver=${receiver}`, () => {
      const declarations: string[] = [];
      const checks: Array<[string, number]> = [];
      for (let mask = 0; mask < 8; mask++) {
        const values = [0, 1, 2].map((bit) => Boolean(mask & (1 << bit)));
        declarations.push(`a${mask} = array.from(${values.join(', ')})`);
        for (const member of ['some', 'every']) {
          const title = `${member}${mask}`;
          const call = receiver ? `a${mask}.${member}()` : `array.${member}(a${mask})`;
          declarations.push(`plot(${call} ? 1 : 0, "${title}")`);
          checks.push([title, Number(member === 'some' ? values.some(Boolean) : values.every(Boolean))]);
        }
      }
      const result = runCompatScript(`//@version=${version}\nindicator("Bool predicate cells")\n${declarations.join('\n')}`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const [title, expected] of checks) expect(getPlot(result, title).values).toEqual(Array(3).fill(expected));
    });
  }
});
