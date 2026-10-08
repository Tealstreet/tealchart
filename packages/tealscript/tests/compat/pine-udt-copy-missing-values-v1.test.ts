import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('standalone UDT copies preserve missing value fields independently', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} receiver=${receiver}`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("Copy missing numeric fields")
type Cell
    int count
    float score
original = Cell.new(na, na)
copied = ${receiver ? 'original.copy()' : 'Cell.copy(original)'}
plot(na(copied.count) ? 1 : 0, "MissingInt")
plot(na(copied.score) ? 1 : 0, "MissingFloat")
copied.count := 17
copied.score := -8.5
plot(na(original.count) ? 1 : 0, "OriginalIntMissing")
plot(na(original.score) ? 1 : 0, "OriginalFloatMissing")
original.count := -31
original.score := 43.25
plot(copied.count, "CopiedInt")
plot(copied.score, "CopiedFloat")
plot(original.count, "OriginalInt")
plot(original.score, "OriginalFloat")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      const expected = { MissingInt: 1, MissingFloat: 1, OriginalIntMissing: 1, OriginalFloatMissing: 1, CopiedInt: 17, CopiedFloat: -8.5, OriginalInt: -31, OriginalFloat: 43.25 };
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values).toEqual([value, value, value]);
    });
  }
});
