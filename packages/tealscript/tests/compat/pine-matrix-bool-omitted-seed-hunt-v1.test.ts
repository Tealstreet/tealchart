import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('hunt omitted bool matrix initial values', () => {
  for (const version of [5, 6]) for (const method of [false, true]) for (const seed of ['omitted', 'false', 'true']) {
    it(`v${version} method=${method} seed=${seed}`, () => {
      const initial = seed === 'omitted' ? '' : `, ${seed}`;
      const read = method ? 'm.get(0, 0)' : 'matrix.get(m, 0, 0)';
      const observation = version === 5 && seed === 'omitted' ? `na(${read})` : `str.tostring(${read}) == "${seed === 'true' ? 'true' : 'false'}"`;
      const result = runCompatScript(`//@version=${version}
indicator("Bool matrix default hunt")
m = matrix.new<bool>(2, 3${initial})
plot(${observation} ? 1 : 0, "Result")
plot(m.rows(), "Rows")
plot(m.columns(), "Columns")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Result').values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Rows').values).toEqual([2, 2, 2]);
      expect(getPlot(result, 'Columns').values).toEqual([3, 3, 3]);
    });
  }
});


describe('omitted matrix bool seed boundaries', () => {
  for (const version of [5, 6]) for (const kind of ['array', 'udt']) {
    it(`v${version} existing ${kind} bool default`, () => {
      const setup = kind === 'array' ? 'a = array.new<bool>(2)\nx = a.get(0)' : 'type Cell\n    bool active\na = Cell.new()\nx = a.active';
      const read = version === 5 ? 'na(x)' : 'str.tostring(x) == "false"';
      const result = runCompatScript(`//@version=${version}\nindicator("Existing bool defaults")\n${setup}\nplot(${read} ? 1 : 0, "Result")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Result').values).toEqual([1, 1, 1]);
    });
  }
  for (const version of [5, 6]) for (const type of ['int', 'float']) for (const method of [false, true]) {
    it(`v${version} omitted ${type} method=${method}`, () => {
      const read = method ? 'm.get(0, 0)' : 'matrix.get(m, 0, 0)';
      const result = runCompatScript(`//@version=${version}\nindicator("Numeric matrix defaults")\nm = matrix.new<${type}>(2, 3)\nplot(na(${read}) ? 1 : 0, "Result")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Result').values).toEqual([1, 1, 1]);
    });
  }
});
