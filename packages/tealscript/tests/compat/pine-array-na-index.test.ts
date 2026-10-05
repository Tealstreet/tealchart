import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { createPineArray, getArrayValue, pushArrayValue, setArrayValue, sliceArray } from '../../src/runtime/arrays';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Compatibility evidence supplied by the corpus regression audit: published
// KC Combo:188, Intermediate Stoch:149, and Flip Flop:112 execute on TradingView
// despite warmup na indices. The manual settles finite out-of-bounds errors,
// not this missing-index boundary. These are small adapted shapes, not copied
// corpus scripts or captured data. See the external collection-na-index report.
const bars = compatibilityBars.slice(0, 3);

function run(body: string, version = 5) {
  const source = `//@version=${version}\nindicator("Missing array index")\n${body}`;
  expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  return runCompatScript(source, { bars });
}

describe('array.get missing-index warmup compatibility', () => {
  it('KC Combo color selection allows rounded unavailable percent and then a defined percent', () => {
    const result = run(`selectColor(percent, selection, palette) =>
    selection == "Solid" ? #123456 : array.get(palette, math.round(percent))
palette = array.from(#123456, #ABCDEF, #654321)
percent = bar_index == 1 ? 1.6 : na
tint = selectColor(percent, "Gradient", palette)
solid = selectColor(percent, "Solid", palette)
plot(close, title="Gradient", color=tint)
plot(close, title="Solid", color=solid)`);
    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors ?? 0).toBe(0);
    expect(getPlot(result, 'Gradient').color).toEqual([null, '#654321', null]);
    expect(getPlot(result, 'Solid').color).toEqual(['#123456', '#123456', '#123456']);
    expect(getPlot(result, 'Gradient').values).toEqual([102, 105, 107]);
  });

  it('Intermediate Stoch selects a palette before reading a rounded warmup index', () => {
    const result = run(`selectColor(percent, type, first, second) =>
    array.get(type == "First" ? first : second, math.round(percent))
first = array.from(#123456, #ABCDEF)
second = array.from(#654321, #FEDCBA)
percent = bar_index == 0 ? na : bar_index == 1 ? 0.2 : 0.8
plot(close, title="First", color=selectColor(percent, "First", first, second))
plot(close, title="Second", color=selectColor(percent, "Second", first, second))`);
    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors ?? 0).toBe(0);
    expect(getPlot(result, 'First').color).toEqual([null, '#123456', '#ABCDEF']);
    expect(getPlot(result, 'Second').color).toEqual([null, '#654321', '#FEDCBA']);
  });

  it('Flip Flop reads an unavailable typed search index until a match is assigned', () => {
    const result = run(`lows = array.from(-7.0, 11.0)
int found = na
if bar_index == 1
    found := array.indexof(lows, 11.0)
selected = array.get(lows, found)
plot(selected, title="Selected")
plot(na(selected) ? 1 : 0, title="Missing")
plot(close, title="After")`);
    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors ?? 0).toBe(0);
    expect(getPlot(result, 'Selected').values).toEqual([null, 11, null]);
    expect(getPlot(result, 'Missing').values).toEqual([1, 0, 1]);
    expect(getPlot(result, 'After').values).toEqual([102, 105, 107]);
  });

  it.each([
    ['namespace', '', 'array.get(values, index)'],
    ['named namespace', '', 'array.get(index=index, id=values)'],
    ['receiver', '', 'values.get(index)'],
    ['typed UDF receiver', 'read(array<float> receiver, int index) => receiver.get(index)', 'read(values, index)'],
    ['generic UDF receiver', 'read(receiver, index) => receiver.get(index)', 'read(values, index)'],
    [
      'slice receiver',
      'read(array<float> receiver, int index) => receiver.get(index)',
      'read(array.slice(values, 1, 3), index)',
    ],
  ])('returns na and resumes finite reads through %s', (_name, declaration, call) => {
    const result = run(
      `${declaration}
values = array.from(3.0, -5.0, 7.0)
index = bar_index == 0 ? int(na) : bar_index == 1 ? 1 : -1
plot(${call}, title="Value")
plot(close, title="After")`,
      6,
    );
    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors ?? 0).toBe(0);
    expect(getPlot(result, 'Value').values).toEqual(_name === 'slice receiver' ? [null, 7, 7] : [null, -5, 7]);
    expect(getPlot(result, 'After').values).toEqual([102, 105, 107]);
  });

  it.each([3, -4])('still raises a public runtime error for finite out-of-range index %s', (index) => {
    const result = run(
      `values = array.from(3.0, -5.0, 7.0)
plot(array.get(values, ${index}), title="Value")
plot(close, title="After")`,
      6,
    );
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toContain(`Array index ${index} is out of bounds`);
    expect(result.profile.compiledBarErrors ?? 0).toBe(0);
    expect(result.plots.every((plot) => plot.values.every((value) => value === null))).toBe(true);
  });

  it('still rejects a missing array receiver even when the index is na', () => {
    const result = run(
      `array<float> missing = na
plot(array.get(missing, int(na)), title="Value")`,
      6,
    );
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toContain('Array methods cannot be called when the ID is na');
  });

  it('keeps get-only missing-index handling separate from mutations and slice bounds', () => {
    const values = createPineArray<number>();
    pushArrayValue(values, 3);
    pushArrayValue(values, -5);
    const slice = sliceArray(values, 1, 2);
    expect(getArrayValue(values, Number.NaN)).toBeNaN();
    expect(getArrayValue(createPineArray(), Number.NaN)).toBeNaN();
    expect(getArrayValue(slice, Number.NaN)).toBeNaN();
    expect(getArrayValue(slice, 0)).toBe(-5);
    expect(() => setArrayValue(values, Number.NaN, 9)).toThrow('out of bounds');
    expect(() => getArrayValue(values, Number.POSITIVE_INFINITY)).toThrow('out of bounds');
    expect(() => getArrayValue(values, Number.NEGATIVE_INFINITY)).toThrow('out of bounds');
    expect(() => getArrayValue(slice, 1)).toThrow('out of bounds');
    values.values.pop();
    expect(() => getArrayValue(slice, Number.NaN)).toThrow('Slice is out of bounds');
  });
});
