import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeScript } from '../compiledOnly';

const bars = [1, 2].map((close, i) => ({
  time: (i + 1) * 60000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));
const run = (body: string, version = 6) =>
  executeScript(parse(`//@version=${version}\nindicator("bool ledger")\n${body}\n`), bars);
const errors = (body: string, version = 6) =>
  checkProgram(parse(`//@version=${version}\nindicator("bool ledger")\n${body}\n`)).diagnostics.filter(
    (d) => d.severity === 'error',
  );

describe('ledger gaps 166–191: names and bool (reference bool and v6 migration)', () => {
  it('166–168: v5 namespace names and renamed abs named slot', () => {
    expect(run('plot(math.min(2, 1))\nplot(math.abs(number=-3))', 5).plots.map((p) => p.values)).toEqual([
      [1, 1],
      [3, 3],
    ]);
    expect(errors('plot(min(1, 2))', 5).length).toBeGreaterThan(0);
    expect(errors('plot(abs(-1))', 5).length).toBeGreaterThan(0);
    expect(errors('plot(math.abs(x=-1))', 5).some((d) => d.code === 'unknown-argument')).toBe(true);
  });
  it.each([5, 6])('169–172,187–188: unselected bool if and switch in v%i', (version) => {
    const result = run(
      'a = if false\n    true\nb = switch 2\n    1 => true\nplot(a ? 1 : 0)\nplot(b ? 1 : 0)' +
        (version === 5
          ? '\nplot(na(a) ? 1 : 0)\nplot(na(b) ? 1 : 0)'
          : '\nplot(a == false ? 1 : 0)\nplot(b == false ? 1 : 0)'),
      version,
    );
    expect(result.errors).toEqual([]);
    expect(result.plots.map((p) => p.values)).toEqual(
      version === 5
        ? [
            [0, 0],
            [0, 0],
            [1, 1],
            [1, 1],
          ]
        : [
            [0, 0],
            [0, 0],
            [1, 1],
            [1, 1],
          ],
    );
  });
  it('171: v5 bool history before first bar is NA, not false', () => {
    const result = run(
      'b = close > 0\nprevious = b[1]\nplot(na(previous) ? 1 : 0)\nplot(previous == false ? 1 : 0)',
      5,
    );
    expect(result.errors).toEqual([]);
    expect(result.plots.map((p) => p.values)).toEqual([
      [1, 0],
      [0, 0],
    ]);
  });
  it('173–177: bool na conversion and v6 not bool(na)', () => {
    const result = run(
      'plot(bool(na) ? 1 : 0)\nplot(not bool(na) ? 1 : 0)\nplot(bool(0) ? 1 : 0)\nplot(bool(-2) ? 1 : 0)\nfloat absent = na\nplot(bool(absent) ? 1 : 0)',
    );
    expect(result.errors).toEqual([]);
    expect(result.plots.map((p) => p.values)).toEqual([
      [0, 0],
      [1, 1],
      [0, 0],
      [1, 1],
      [0, 0],
    ]);
  });
  it.each([
    ['const', 'const bool x = false'],
    ['input', 'x = input.bool(false)'],
    ['simple', 'simple bool x = syminfo.type == "stock"'],
    ['series', 'series bool x = close < 0'],
  ])('178–185: bool %s input/return qualifier is preserved', (qualifier, declaration) => {
    const body = `${declaration}\nconverted = bool(x)\nplot(converted ? 1 : 0)`;
    const checked = checkProgram(parse(`//@version=6\nindicator("qualifier")\n${body}`));
    expect(checked.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(checked.symbols.find((symbol) => symbol.name === 'converted')?.type).toEqual({ kind: 'bool', qualifier });
    expect(run(body).errors).toEqual([]);
  });
  it('190–191: v5 bool na differs from false but behaves as false in a condition', () => {
    const result = run('bool x = na\nplot(x == false ? 1 : 0)\nplot(x ? 1 : 0)\nplot(na(x) ? 1 : 0)', 5);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((p) => p.values)).toEqual([
      [0, 0],
      [0, 0],
      [1, 1],
    ]);
  });
  it.each([
    'bool("true")',
    'bool(x=color.red)',
    'bool(array.new<int>())',
    'bool(map.new<string, int>())',
    'bool(label.new(bar_index, close))',
  ])('178–185: refuses an unadmitted bool argument %s', (expression) => {
    expect(errors(`plot(${expression} ? 1 : 0)`).some((d) => d.code === 'type-mismatch')).toBe(true);
  });
  it('178–185: local bool function retains its own string contract', () => {
    const body = 'bool(string value) => str.length(value)\nplot(bool("ok"))';
    expect(errors(body)).toEqual([]);
    expect(run(body).plots[0].values).toEqual([2, 2]);
  });
});
