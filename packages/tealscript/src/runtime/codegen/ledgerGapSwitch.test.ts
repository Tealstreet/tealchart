import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

const bars = [1, 2].map((close, i) => ({
  time: (i + 1) * 60000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));
const run = (body: string, version = 6) => {
  const result = executeScript(parse(`//@version=${version}\nindicator("switch result")\n${body}\n`), bars);
  expect(result.errors).toEqual([]);
  return result.plots.map((plot) => plot.values);
};

describe('ledger169/172/188: missing switch result uses its documented type', () => {
  it.each([5, 6])('discriminant switch bool result in v%i', (version) => {
    const predicate = version === 5 ? 'na(x)' : 'x == false';
    expect(run(`flag = close > 0\nx = switch 0\n    1 => flag\nplot(${predicate} ? 1 : 0)`, version)).toEqual([[1, 1]]);
  });
  it.each([5, 6])('predicate switch bool result in v%i', (version) => {
    const predicate = version === 5 ? 'na(x)' : 'x == false';
    expect(run(`x = switch\n    close < 0 => true\nplot(${predicate} ? 1 : 0)`, version)).toEqual([[1, 1]]);
  });
  it('bool UDF arm and explicit selected/default results', () => {
    expect(
      run(
        'f() => close > 0\nx = switch 0\n    1 => f()\ny = switch 1\n    1 => true\nz = switch\n    false => true\n    => false\nplot(x == false ? 1 : 0)\nplot(y ? 1 : 0)\nplot(z == false ? 1 : 0)',
      ),
    ).toEqual([
      [1, 1],
      [1, 1],
      [1, 1],
    ]);
  });
  it('bool block-tail and reassignment do not retain a previous true result', () => {
    expect(
      run(
        'bool x = true\nx := switch 0\n    1 =>\n        bool value = close > 0\n        value\nplot(x == false ? 1 : 0)',
      ),
    ).toEqual([[1, 1]]);
  });
  it.each([5, 6])('numeric unselected results remain NA in v%i', (version) => {
    expect(
      run(
        'x = switch 0\n    1 => close\ny = switch\n    false => 1\nplot(na(x) ? 1 : 0)\nplot(na(y) ? 1 : 0)',
        version,
      ),
    ).toEqual([
      [1, 1],
      [1, 1],
    ]);
  });
});
