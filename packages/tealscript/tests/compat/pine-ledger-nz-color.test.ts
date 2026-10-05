import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';

const bars = [4, 6, 8].map((close, i) => ({ time: i * 60000, open: close, high: close + 1, low: close - 1, close, volume: 1 }));
const run = (body: string) => executeScript(parse(`//@version=6\nindicator("nz colors")\n${body}`), bars);

describe('ledger gaps121–125: nz typed values and replacement', () => {
  it.each([
    ['simple color', 'simple color source = na', 'source', [100, 100, 100]],
    ['series color', 'source = bar_index == 0 ? color(na) : #224466', 'source', [100, 0, 0]],
    ['first-bar color history', 'source = #224466', 'source[1]', [100, 0, 0]],
    ['inferred color alias', 'color source = na\nalias = source', 'alias', [100, 100, 100]],
    ['direct color cast', '', 'color(na)', [100, 100, 100]],
    ['color array read', 'values = array.new<color>(1)', 'array.get(values, 0)', [100, 100, 100]],
  ])('omitted replacement yields transparent black for %s', (_label, declaration, source, expected) => {
    const result = run(`${declaration}\nplot(color.t(nz(${source})), "T")\nplot(color.r(nz(${source})), "R")`);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual(expected);
    expect(result.plots[1].values).toEqual(expected.map((t) => t === 100 ? 0 : 34));
  });

  it('uses the color default inside a typed UDF and keeps a numeric shadow independent', () => {
    const result = run('fillColor(color source) => nz(source)\nfillNumber(float source) => nz(source)\nplot(color.t(fillColor(color(na))))\nplot(fillNumber(float(na)))');
    expect(result.errors).toEqual([]);
    expect(result.plots.map((p) => p.values)).toEqual([[100, 100, 100], [0, 0, 0]]);
  });

  it('preserves a defined color and uses an explicit color fallback only for missing source', () => {
    const result = run('source = bar_index == 0 ? color(na) : #224466\nplot(color.r(nz(source, #abcdef)))\nplot(color.t(nz(source, #abcdef)))');
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([171, 34, 34]);
    expect(result.plots[1].values).toEqual([0, 0, 0]);
  });

  it.each(['int', 'float', 'color'])('explicit missing %s replacement remains missing', (kind) => {
    const projection = kind === 'color' ? 'color.t(value)' : 'value';
    const result = run(`${kind} source = na\n${kind} replacement = na\nvalue = nz(source, replacement)\nplot(${projection})`);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values.every((value) => value === null || Number.isNaN(value))).toBe(true);
  });

  it.each(['int', 'float'])('%s defaults to zero and preserves defined source', (kind) => {
    const result = run(`${kind} source = na\nplot(nz(source))\nplot(nz(bar_index == 0 ? ${kind}(na) : ${kind}(4), ${kind}(9)))`);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([0, 0, 0]);
    expect(result.plots[1].values).toEqual([9, 4, 4]);
  });
});
