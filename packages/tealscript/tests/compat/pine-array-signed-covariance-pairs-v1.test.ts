import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('signed asymmetric covariance retains index pairing and estimate divisor', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const sliced of [false, true]) {
    it(`v${version} receiver=${receiver} sliced=${sliced}`, () => {
      const x = [-3, -1, 1, 3], y = [5, -7, 2, 4];
      const setup = (name: string, values: number[]) => sliced ? `p${name} = array.from(97.0, ${values.map(v => `${v}.0`).join(', ')}, -83.0)\n${name} = array.slice(p${name}, 1, 5)` : `${name} = array.from(${values.map(v => `${v}.0`).join(', ')})`;
      const call = (left: string, right: string, biased: boolean) => receiver ? `${left}.covariance(${right}, ${biased})` : `array.covariance(biased=${biased}, id2=${right}, id1=${left})`;
      const result = runCompatScript(`//@version=${version}
indicator("Signed covariance pairs")
${setup('x', x)}
${setup('y', y)}
${setup('z', y.map(v => -v))}
plot(${call('x', 'y', true)}, "Population")
plot(${call('x', 'y', false)}, "Sample")
plot(${call('y', 'x', true)}, "Swapped")
plot(${call('x', 'z', true)}, "Reflected")
${[x, y].flatMap((values, a) => values.map((_, i) => `plot(array.get(${a === 0 ? 'x' : 'y'}, ${i}), "Cell${a}_${i}")`)).join('\n')}`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      const expected = { Population: 1.5, Sample: 2, Swapped: 1.5, Reflected: -1.5 };
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values).toEqual([value, value, value]);
      [x, y].forEach((values, a) => values.forEach((value, i) => expect(getPlot(result, `Cell${a}_${i}`).values).toEqual([value, value, value])));
    });
  }
});
