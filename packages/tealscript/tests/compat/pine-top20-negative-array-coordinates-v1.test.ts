import { describe, expect, it } from 'vitest';

import {
  createPineArray,
  getArraySize,
  getArrayValue,
  removeArrayValue,
  setArrayValue,
} from '../../src/runtime/arrays';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const reference =
  'https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#negative-indices-in-arrays';
const call = (form: string, member: string, args: string) =>
  form === 'method' ? `a.${member}(${args})` : `array.${member}(a, ${args})`;

for (const form of ['namespace', 'method']) {
  describe(`documented negative array coordinates: ${form}`, () => {
    it('v6 replaces the tail and removes the first element at negative size', () => {
      const result = runCompatScript(`//@version=6
indicator("Negative array coordinates")
a = array.from(10, 20, 30)
${call(form, 'set', '-1, 40')}
tail = ${call(form, 'get', '-1')}
removed = ${call(form, 'remove', '-3')}
plot(tail, title="tail")
plot(removed, title="removed")
plot(a.get(0), title="first")
plot(a.get(1), title="last")
plot(a.size(), title="size")`);
      expect(result.errors, reference).toEqual([]);
      for (const [title, expected] of [
        ['tail', 40],
        ['removed', 10],
        ['first', 20],
        ['last', 40],
        ['size', 2],
      ] as const) {
        expect(getPlot(result, title).values, reference).toEqual(compatibilityBars.map(() => expected));
      }
    });

    for (const member of ['set', 'remove']) {
      it(`v6 refuses ${member} below negative size`, () => {
        const result = runCompatScript(`//@version=6
indicator("Negative bound")
a = array.from(10, 20, 30)
${call(form, member, member === 'set' ? '-4, 40' : '-4')}
plot(a.size())`);
        expect(result.errors.map((error) => error.message).join('\n'), reference).toMatch(
          /Array index -4 is out of bounds/,
        );
      });

      it(`v5 refuses the negative ${member} coordinate`, () => {
        const result = runCompatScript(`//@version=5
indicator("Legacy coordinate")
a = array.from(10, 20, 30)
${call(form, member, member === 'set' ? '-1, 40' : '-3')}
plot(a.size())`);
        expect(result.errors.map((error) => error.message).join('\n'), reference).toMatch(
          /negative in this Pine version/,
        );
      });
    }

    it('v5 retains nonnegative coordinate controls', () => {
      const result = runCompatScript(`//@version=5
indicator("Positive coordinates")
a = array.from(10, 20, 30)
${call(form, 'set', '2, 40')}
removed = ${call(form, 'remove', '0')}
plot(removed, title="removed")
plot(a.get(0), title="first")
plot(a.get(1), title="last")
plot(a.size(), title="size")`);
      expect(result.errors, reference).toEqual([]);
      for (const [title, expected] of [
        ['removed', 10],
        ['first', 20],
        ['last', 40],
        ['size', 2],
      ] as const) {
        expect(getPlot(result, title).values, reference).toEqual(compatibilityBars.map(() => expected));
      }
    });
  });
}

for (const member of ['set', 'remove']) {
  it(`invalid ${member} leaves existing slots and length intact`, () => {
    const array = createPineArray<number>(3);
    [10, 20, 30].forEach((value, index) => setArrayValue(array, index, value));
    const operation = () => (member === 'set' ? setArrayValue(array, -4, 40) : removeArrayValue(array, -4));
    expect(operation, reference).toThrow(/Array index -4 is out of bounds/);
    expect(getArraySize(array), reference).toBe(3);
    expect(
      [0, 1, 2].map((index) => getArrayValue(array, index)),
      reference,
    ).toEqual([10, 20, 30]);
  });
}
