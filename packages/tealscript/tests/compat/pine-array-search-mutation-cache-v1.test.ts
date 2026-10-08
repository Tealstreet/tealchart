import { describe, expect, it } from 'vitest';
import { createPineArray, indexOfArrayValue, setArrayValue } from '../../src/runtime/arrays';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('repeated numeric search retains first occurrence after slot replacement', () => {
  it('invalidates cached first-occurrence state after each replacement', () => {
    const array = createPineArray<number>(128, 0);
    for (let i = 0; i < 128; i++) setArrayValue(array, i, i === 97 ? 17.5 : i + 0.5);
    for (let i = 0; i < 40; i++) expect(indexOfArrayValue(array, 17.5)).toBe(17);
    setArrayValue(array, 17, -53.5);
    for (let i = 0; i < 40; i++) expect(indexOfArrayValue(array, 17.5)).toBe(97);
    setArrayValue(array, 97, -67.5);
    for (let i = 0; i < 40; i++) expect(indexOfArrayValue(array, 17.5)).toBe(-1);
  });
  for (const version of [5, 6]) {
    it(`v${version} compiled repeated searches track slot replacements`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("Repeated search updates")
a = array.new<float>(128, 0)
for i = 0 to 127
    a.set(i, i == 97 ? 17.5 : i + 0.5)
first = 0
for i = 0 to 39
    first += a.indexof(17.5)
a.set(17, -53.5)
next = 0
for i = 0 to 39
    next += a.indexof(17.5)
a.set(97, -67.5)
absent = 0
for i = 0 to 39
    absent += a.indexof(17.5)
plot(first, "First")
plot(next, "Next")
plot(absent, "Absent")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const [title, value] of [['First', 680], ['Next', 3880], ['Absent', -40]] as const) expect(getPlot(result, title).values).toEqual([value, value, value]);
    });
  }
});
