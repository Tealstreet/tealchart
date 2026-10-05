import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime';
import { checkProgram } from '../../src/semantic/checker';

const bars = [10, 20, 30, 40, 50].map((close, i) => ({
  time: 60000 * (i + 1),
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 100,
}));
const source = (body: string, version = 6) => `//@version=${version}\nindicator("Loop UDF census")\n${body}`;
const errors = (body: string, version = 6) =>
  checkProgram(parse(source(body, version))).diagnostics.filter((d) => d.severity === 'error');

describe('documented loop boundaries and scope', () => {
  const cases = [
    [
      'regular local reinitializes',
      6,
      `total=0
for i=0 to 2
    local=0
    local += 1
    total += local
plot(total)`,
      [3, 3, 3, 3, 3],
    ],
    [
      'outer reassignment',
      6,
      `total=7
for i=1 to 3
    total += i
plot(total)`,
      [13, 13, 13, 13, 13],
    ],
    [
      'local declaration preserves global',
      6,
      `value=close
for i=0 to 2
    value=9
plot(value)`,
      [10, 20, 30, 40, 50],
    ],
    [
      'nested counters isolate',
      6,
      `total=0
for i=1 to 2
    for i=3 to 4
        total += i
    total += i
plot(total)`,
      [17, 17, 17, 17, 17],
    ],
    [
      'v6 dynamic end',
      6,
      `end=3
total=0
for i=1 to end
    end := 1
    total += i
plot(total)`,
      [1, 1, 1, 1, 1],
    ],
    [
      'v5 fixed end',
      5,
      `end=3
total=0
for i=1 to end
    end := 1
    total += i
plot(total)`,
      [6, 6, 6, 6, 6],
    ],
  ] as const;
  it.each(cases)('%s', (_name, version, body, expected) => {
    expect(errors(body, version)).toEqual([]);
    const result = executeScript(parse(source(body, version)), bars);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual(expected);
  });
  it.each(['i', 'local'])('rejects escaped loop binding %s', (binding) => {
    expect(errors(`for i=0 to 2\n    local=i\nplot(${binding})`)).toContainEqual(
      expect.objectContaining({ code: 'unknown-identifier', message: `Unknown identifier: ${binding}` }),
    );
  });
});

describe('documented UDF binding restrictions', () => {
  const globalOnlyCalls = [
    'indicator("Nested")',
    'strategy("Nested")',
    'library("Nested")',
    'plot(close)',
    'hline(1)',
    'fill(first,second)',
    'plotshape(true)',
    'plotchar(true)',
    'plotarrow(1)',
    'plotbar(open,high,low,close)',
    'plotcandle(open,high,low,close)',
    'barcolor(color.red)',
    'bgcolor(color.red)',
    'alertcondition(true)',
  ];
  it.each(globalOnlyCalls)('forbids global-only %s inside a UDF', (call) => {
    expect(errors(`first=plot(close)\nsecond=plot(open)\nf() =>\n    ${call}\nplot(close)`)).toContainEqual(
      expect.objectContaining({ code: 'scope-mismatch' }),
    );
  });
  it.each([
    'outer() =>\n    inner() => 1\n    inner()\nplot(outer())',
    'if true\n    inner() => 1\nplot(close)',
    'for i=0 to 1\n    inner() => 1\nplot(close)',
    'while false\n    inner() => 1\nplot(close)',
  ])('forbids nonglobal definitions', (body) => {
    expect(errors(body).some((d) => d.code === 'function-scope' || d.code === 'function-definition-scope')).toBe(true);
  });
  it.each([
    'select(float value) => value\nselect(float value,float extra=1) => value+extra',
    'select(float value) => value\nselect(float renamed) => renamed',
  ])('rejects indistinguishable required overload signatures', (definitions) => {
    expect(errors(`${definitions}\nplot(select(close))`)).toContainEqual(
      expect.objectContaining({ code: 'invalid-overload' }),
    );
  });
  it('selects distinct required types and named bindings', () => {
    const body = `select(float value) => value+0.5
select(bool value) => value ? 10.0 : 20.0
select(color value) => color.r(value)
plot(select(close))
plot(select(value=true))
plot(select(#123456))`;
    expect(errors(body)).toEqual([]);
    const result = executeScript(parse(source(body)), bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((p) => p.values)).toEqual([
      [10.5, 20.5, 30.5, 40.5, 50.5],
      [10, 10, 10, 10, 10],
      [18, 18, 18, 18, 18],
    ]);
  });
  it('reuses one written persistent scope across loop iterations', () => {
    const body = `accumulate() =>
    var float total=0
    total += 1
    total
float result=na
for i=0 to 2
    result := accumulate()
plot(result)`;
    expect(errors(body)).toEqual([]);
    const result = executeScript(parse(source(body)), bars);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([3, 6, 9, 12, 15]);
  });
});
