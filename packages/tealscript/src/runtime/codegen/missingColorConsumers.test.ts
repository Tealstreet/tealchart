import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic';
import {
  concatArray,
  copyArray,
  createPineArray,
  includesArrayValue,
  indexOfArrayValue,
  lastIndexOfArrayValue,
  sliceArray,
} from '../arrays';
import { captureDispatchMatcher, executeCompiled, tryCompile } from './execute';
import { MISSING_COLOR, MISSING_COLOR_KEY } from './missingColor';

function execute(body: string, count = 1) {
  const program = parse(`//@version=6\nindicator("QA missing-color search preservation")\n${body}`);
  expect(checkProgram(program).diagnostics).toEqual([]);
  const compiled = tryCompile(program);
  expect(compiled.success, compiled.unsupported.join('\n')).toBe(true);
  const result = executeCompiled(compiled, Array.from({ length: count }, (_, index) => ({
    time: 1700000000000 + index * 60000, open: 1, high: 2, low: 0, close: 1, volume: 1,
  })))!;
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
  return result;
}

describe('missing-color consumer preservation (engine regressions, no native credit)', () => {
  it.each(['c = color(na)', 'color c = na'])('preserves the QA minimal search source: %s', (declaration) => {
    const result = execute(`${declaration}
a = array.from(c)
plot(na(array.get(a, 0)) ? 1 : 0)
plot(array.get(a, 0) == c ? 1 : 0)
plot(array.includes(a, c) ? 1 : 0)
plot(array.indexof(a, c))
plot(array.lastindexof(a, c))`);
    expect(result.plots.map((plot) => plot.values)).toEqual([[1], [0], [0], [-1], [-1]]);
  });

  it('does not match missing colors in owners, views, copies, concatenations or cached searches', () => {
    for (const missing of [Number.NaN, MISSING_COLOR]) {
      const owner = createPineArray<unknown>(128, missing);
      const arrays = [owner, sliceArray(owner, 1, 127), copyArray(owner), concatArray(copyArray(owner), owner)];
      for (const array of arrays) {
        for (let search = 0; search < 40; search++) {
          expect(indexOfArrayValue(array, missing)).toBe(-1);
          expect(includesArrayValue(array, missing)).toBe(false);
          expect(lastIndexOfArrayValue(array, missing)).toBe(-1);
        }
      }
    }
    const cached = createPineArray<unknown>(128, MISSING_COLOR);
    for (let search = 0; search < 40; search++) expect(indexOfArrayValue(cached, '#ff0000')).toBe(-1);
    expect(indexOfArrayValue(cached, MISSING_COLOR)).toBe(-1);
  });

  it('retains missing map-key lookup, overwrite, copy, merge and removal behavior', () => {
    const result = execute(`c = color(na)
color typed = na
m = map.new<color, int>()
map.put(m, c, 7)
plot(map.contains(m, typed) ? 1 : 0)
plot(map.get(m, typed))
map.put(m, typed, 9)
copied = map.copy(m)
merged = map.new<color, int>()
map.put_all(merged, copied)
plot(map.size(merged))
plot(map.remove(merged, c))
plot(map.size(merged))`);
    expect(result.plots.map((plot) => plot.values)).toEqual([[1], [7], [1], [9], [0]]);
  });

  it('preserves missing sort-field ordering in UDT arrays and matrices', () => {
    const result = execute(`type Cell
    color c
    int serial
earlierCell = Cell.new(na, 1)
laterCell = Cell.new(color(na), 2)
presentCell = Cell.new(color.red, 3)
a = array.from(earlierCell, laterCell, presentCell)
array.sort(a, sort_field="c")
plot(array.get(a, 0).serial)
plot(array.get(a, 1).serial)
plot(array.get(a, 2).serial)
m = matrix.new<Cell>(3, 1, earlierCell)
matrix.set(m, 1, 0, laterCell)
matrix.set(m, 2, 0, presentCell)
matrix.sort(m, sort_field="c")
plot(matrix.get(m, 0, 0).serial)
plot(matrix.get(m, 1, 0).serial)
plot(matrix.get(m, 2, 0).serial)`);
    expect(result.plots.map((plot) => plot.values)).toEqual([[3], [1], [2], [3], [1], [2]]);
  });

  it('preserves array-search missingness on matrix rows', () => {
    const result = execute(`c = color(na)
m = matrix.new<color>(1, 2, c)
r = matrix.row(m, 0)
plot(array.includes(r, c) ? 1 : 0)
plot(array.indexof(r, c))
plot(array.lastindexof(r, c))`);
    expect(result.plots.map((plot) => plot.values)).toEqual([[0], [-1], [-1]]);
  });

  it('keeps history, container stringification and plot output transport free of the marker', () => {
    const result = execute(`c = color(na)
a = array.from(c)
copied = array.copy(a)
array.concat(copied, a)
previous = c[1]
plot(na(previous) ? 1 : 0, color=c)
plot(previous == c ? 1 : 0)
plot(str.length(str.tostring(copied)))
plot(array.includes(copied, c) ? 1 : 0)` , 2);
    expect(result.plots.map((plot) => plot.values)).toEqual([[1, 1], [0, 0], [10, 10], [0, 0]]);
    expect(result.plots[0].color).toEqual([null, null]);
    expect(structuredClone(result)).toEqual(result);
    expect(JSON.stringify(result)).not.toContain(MISSING_COLOR_KEY);
  });

  it('does not lose a nested missing-color capture when serializing request dispatch keys', () => {
    const matches = captureDispatchMatcher({ slots: { color: MISSING_COLOR } });
    expect(matches({ slots: { color: MISSING_COLOR } })).toBe(true);
    expect(matches({ slots: {} })).toBe(false);
    expect(matches({ slots: { color: Number.NaN } })).toBe(false);
    const captured = captureDispatchMatcher({ slots: { kind: 'capture', value: { color: MISSING_COLOR } } });
    expect(captured({ slots: { kind: 'capture', value: {} } })).toBe(false);
  });

  it('exports missing input-color metadata as NaN while retaining internal getter provenance', () => {
    const result = execute(`c = input.color(color(na), "Missing")
plot(na(c) ? 1 : 0)
plot(color.r(c))
plot(color.t(c))`);
    expect(result.plots.map((plot) => plot.values)).toEqual([[1], [0], [100]]);
    expect(result.inputs[0].defval).toBeNaN();
    expect(structuredClone(result)).toEqual(result);
  });
});
