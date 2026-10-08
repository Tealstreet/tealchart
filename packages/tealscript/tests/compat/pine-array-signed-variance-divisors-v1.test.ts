import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('signed array variance and stdev distinguish population and sample divisors', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const sliced of [false, true]) {
    it(`v${version} receiver=${receiver} sliced=${sliced}`, () => {
      const call = (member: string, biased: boolean) => receiver ? `a.${member}(${biased})` : `array.${member}(biased=${biased}, id=a)`;
      const result = runCompatScript(`//@version=${version}
indicator("Signed variance divisors")
${sliced ? 'parent = array.from(83.0, -3.0, -1.0, 1.0, 3.0, -71.0)\na = array.slice(parent, 1, 5)' : 'a = array.from(-3.0, -1.0, 1.0, 3.0)'}
plot(${call('variance', true)}, "PopulationVariance")
plot(${call('variance', false)}, "SampleVariance")
plot(${call('stdev', true)}, "PopulationStdev")
plot(${call('stdev', false)}, "SampleStdev")
${Array.from({ length: 4 }, (_, i) => `plot(array.get(a, ${i}), "Cell${i}")`).join('\n')}
plot(array.size(a), "Size")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      const expected = { PopulationVariance: 5, SampleVariance: 20 / 3, PopulationStdev: Math.sqrt(5), SampleStdev: Math.sqrt(20 / 3) };
      for (const [title, value] of Object.entries(expected)) {
        for (const actual of getPlot(result, title).values) expect(actual).toBeCloseTo(value, 12);
      }
      [-3, -1, 1, 3].forEach((value, i) => expect(getPlot(result, `Cell${i}`).values).toEqual([value, value, value]));
      expect(getPlot(result, 'Size').values).toEqual([4, 4, 4]);
    });
  }
});
