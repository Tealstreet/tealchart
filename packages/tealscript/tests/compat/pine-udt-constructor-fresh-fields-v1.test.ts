import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('repeated UDT constructors retain independent value-field storage', () => {
  for (const version of [5, 6]) for (const defaults of [false, true]) {
    it(`v${version} defaults=${defaults}`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("Fresh constructor field storage")
type Cell
    int count = 17
    string text = "Az"
first = Cell.new(${defaults ? '' : '17, "Az"'})
second = Cell.new(${defaults ? '' : '-8, "B"'})
first.count := 43
first.text := "first"
plot(second.count, "SecondCount")
plot(second.text == ${defaults ? '"Az"' : '"B"'} ? 1 : 0, "SecondText")
second.count := -31
second.text := "second"
plot(first.count, "FirstCount")
plot(first.text == "first" ? 1 : 0, "FirstText")
third = Cell.new(${defaults ? '' : '5, "tail"'})
plot(first.count, "FirstAfterThird")
plot(second.count, "SecondAfterThird")
plot(third.count, "ThirdCount")
plot(third.text == ${defaults ? '"Az"' : '"tail"'} ? 1 : 0, "ThirdText")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      const expected = { SecondCount: defaults ? 17 : -8, SecondText: 1, FirstCount: 43, FirstText: 1, FirstAfterThird: 43, SecondAfterThird: -31, ThirdCount: defaults ? 17 : 5, ThirdText: 1 };
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values).toEqual([value, value, value]);
    });
  }
});
