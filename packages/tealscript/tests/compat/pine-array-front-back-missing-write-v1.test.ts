import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('array setters retain missing writes across front and backing slots', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const front of [false, true]) {
    it(`v${version} receiver=${receiver} front=${front}`, () => {
      const index = front ? 0 : 3;
      const set = (value: string) => receiver ? `alias.set(${index}, ${value})` : `array.set(alias, ${index}, ${value})`;
      const result = runCompatScript(`//@version=${version}
indicator("Front backing missing write")
a = array.new_float(2, 17)
alias = a
array.unshift(a, 43)
array.unshift(a, -8)
${set('float(na)')}
${Array.from({ length: 4 }, (_, i) => `plot(array.get(a, ${i}), "Missing${i}")`).join('\n')}
${set('5')}
${Array.from({ length: 4 }, (_, i) => `plot(array.get(a, ${i}), "Restored${i}")`).join('\n')}
plot(array.size(a), "Size")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      const initial: (number | null)[] = [-8, 43, 17, 17];
      initial[index] = null;
      const restored = [-8, 43, 17, 17];
      restored[index] = 5;
      for (const [prefix, values] of [['Missing', initial], ['Restored', restored]] as const) {
        values.forEach((value, i) => expect(getPlot(result, `${prefix}${i}`).values).toEqual([value, value, value]));
      }
      expect(getPlot(result, 'Size').values).toEqual([4, 4, 4]);
    });
  }
});
