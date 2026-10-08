import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('array concat appends missing slots and returns the mutable first array', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} ${receiver ? 'receiver' : 'namespace'}`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("Concat missing slots")
a = array.from(17.0, float(na))
b = array.from(-8.0, float(na), 43.0)
c = ${receiver ? 'a.concat(b)' : 'array.concat(a, b)'}
${Array.from({ length: 5 }, (_, i) => `plot(array.get(a, ${i}), "Joined${i}")`).join('\n')}
array.set(c, 0, -31)
array.set(b, 0, 5)
plot(array.get(a, 0), "LeftViaReturn")
plot(array.get(a, 2), "AppendedUnaffected")
${Array.from({ length: 3 }, (_, i) => `plot(array.get(b, ${i}), "Right${i}")`).join('\n')}
plot(array.size(a), "LeftSize")
plot(array.size(b), "RightSize")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      [17, null, -8, null, 43].forEach((value, i) => expect(getPlot(result, `Joined${i}`).values).toEqual([value, value, value]));
      [5, null, 43].forEach((value, i) => expect(getPlot(result, `Right${i}`).values).toEqual([value, value, value]));
      for (const [title, value] of Object.entries({ LeftViaReturn: -31, AppendedUnaffected: -8, LeftSize: 5, RightSize: 3 })) {
        expect(getPlot(result, title).values).toEqual([value, value, value]);
      }
    });
  }
});
