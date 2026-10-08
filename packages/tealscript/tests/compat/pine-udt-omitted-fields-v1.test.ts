import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/type-system/#user-defined-types
describe('omitted UDT fields follow version-specific defaults', () => {
  for (const version of [5, 6]) for (const named of [false, true]) {
    it(`v${version} ${named ? 'named integer override' : 'empty constructor'}`, () => {
      const boolObservation = version === 5 ? 'na(sample.flag) ? 1 : 0' : 'str.tostring(sample.flag) == "false" ? 1 : 0';
      const result = runCompatScript(`//@version=${version}
indicator("Omitted UDT field defaults")
type Node
    int value
type Sample
    int count
    float price
    bool flag
    string text
    color shade
    array<int> items
    matrix<float> grid
    Node child
sample = Sample.new(${named ? 'count=7' : ''})
plot(na(sample.count) ? 1 : 0, "Count missing")
plot(na(sample.price) ? 1 : 0, "Price missing")
plot(${boolObservation}, "Bool default")
plot(na(sample.text) ? 1 : 0, "Text missing")
plot(na(sample.shade) ? 1 : 0, "Color missing")
plot(na(sample.items) ? 1 : 0, "Array missing")
plot(na(sample.grid) ? 1 : 0, "Matrix missing")
plot(na(sample.child) ? 1 : 0, "Child missing")`, { bars: compatibilityBars.slice(0, 2) });
      expect(result.errors).toEqual([]);
      for (const title of ['Price missing', 'Bool default', 'Text missing', 'Color missing',
        'Array missing', 'Matrix missing', 'Child missing']) {
        expect(getPlot(result, title).values, title).toEqual([1, 1]);
      }
      expect(getPlot(result, 'Count missing').values).toEqual(named ? [0, 0] : [1, 1]);
    });
  }
  for (const version of [5, 6]) for (const mode of ['explicit default', 'assignment', 'positional'] as const) {
    it(`v${version} preserves ${mode}`, () => {
      const field = mode === 'explicit default' ? 'bool flag = true' : 'bool flag';
      const constructor = mode === 'explicit default' ? 'Sample.new()' : 'Sample.new(false)';
      const assignment = mode === 'assignment' ? 'sample.flag := true' : '';
      const expected = mode === 'positional' ? 'false' : 'true';
      const result = runCompatScript(`//@version=${version}
indicator("Supplied UDT boolean controls")
type Sample
    ${field}
sample = ${constructor}
${assignment}
plot(str.tostring(sample.flag) == "${expected}" ? 1 : 0, "Unchanged bool")`,
      { bars: compatibilityBars.slice(0, 2) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Unchanged bool').values).toEqual([1, 1]);
    });
  }
});
