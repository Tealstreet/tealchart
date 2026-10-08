import { describe, expect, it } from 'vitest';
import { createPineMatrix, reshapeMatrix } from '../../src/runtime/matrices';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('omitted bool matrix axis values', () => {
  for (const version of [5, 6]) for (const axis of ['row', 'col']) for (const method of [false, true]) {
    it(`v${version} ${axis} method=${method}`, () => {
      const call = method ? `m.add_${axis}(0)` : `matrix.add_${axis}(m, 0)`;
      const observation = version === 5 ? 'na(m.get(0, 0))' : 'str.tostring(m.get(0, 0)) == "false"';
      const result = runCompatScript(`//@version=${version}
indicator("Bool axis insertion")
m = matrix.new<bool>(2, 2, true)
${call}
plot(${observation} ? 1 : 0, "Result")
plot(m.get(1, 1) ? 1 : 0, "Existing")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Result').values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Existing').values).toEqual([1, 1, 1]);
    });
  }
});

describe('bool axis boundaries', () => {
  for (const version of [5, 6]) for (const axis of ['row', 'col']) for (const method of [false, true]) for (const kind of ['bool', 'int']) {
    it(`v${version} ${axis} method=${method} control=${kind}`, () => {
      const supplied = kind === 'bool' ? ', array.from(true, false)' : '';
      const call = method ? `m.add_${axis}(0${supplied})` : `matrix.add_${axis}(m, 0${supplied})`;
      const observation = kind === 'bool' ? 'm.get(0, 0) and not m.get(0, 1)' : 'na(m.get(0, 0))';
      const boolObservation = axis === 'col' ? 'm.get(0, 0) and not m.get(1, 0)' : observation;
      const result = runCompatScript(`//@version=${version}
indicator("Axis controls")
m = matrix.new<${kind}>(2, 2, ${kind === 'bool' ? 'true' : '7'})
${call}
plot(${kind === 'bool' ? boolObservation : observation} ? 1 : 0, "Result")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Result').values).toEqual([1, 1, 1]);
    });
  }
});

describe('other bool fallback screen', () => {
  it('partial fill preserves bool values outside its region', () => {
    const result = runCompatScript(`//@version=6
indicator("Partial bool fill")
m = matrix.new<bool>(2, 2, true)
m.fill(false, 0, 1, 0, 1)
plot(not m.get(0, 0) and m.get(1, 1) ? 1 : 0, "Result")`, { bars: compatibilityBars.slice(0, 3) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Result').values).toEqual([1, 1, 1]);
  });
  it('array size-only bool default is false', () => {
    const result = runCompatScript(`//@version=6
indicator("Array bool default")
a = array.new<bool>(2)
plot(str.tostring(a.get(0)) == "false" ? 1 : 0, "Result")`, { bars: compatibilityBars.slice(0, 3) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Result').values).toEqual([1, 1, 1]);
  });
  it('reshape cannot grow the element count', () => {
    const matrix = createPineMatrix(2, 2, true);
    expect(() => reshapeMatrix(matrix, 3, 2)).toThrow('Matrix reshape must preserve element count');
    expect(matrix.values).toEqual([true, true, true, true]);
  });
});
