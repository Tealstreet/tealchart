import type { SemanticQualifier } from '../../semantic';

import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram, checkSemanticTypeInvariants } from '../../semantic';
import { executeScript } from '../compiledOnly';

const bars = [0, 1, 2].map((index) => ({
  time: (index + 1) * 60000,
  open: 10,
  high: 11,
  low: 9,
  close: 10,
  volume: 100,
}));
const qualifiers: SemanticQualifier[] = ['const', 'input', 'simple', 'series'];
const citation =
  'https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#fractional-division-of-constants';

describe('v4/v5 const-int division', () => {
  it.each([4, 5, 6])('keeps the full qualifier matrix correct in declared v%i', (version) => {
    const input = (value: number) => (version === 4 ? `input(${value}, type=input.integer)` : `input.int(${value})`);
    const lines = [
      `//@version=${version}`,
      version === 4 ? 'study("division")' : 'indicator("division")',
      'const int n_const = 5',
      'const int d_const = 2',
      `n_input = ${input(5)}`,
      `d_input = ${input(2)}`,
      'simple int n_simple = 5',
      'simple int d_simple = 2',
      'series int n_series = bar_index - bar_index + 5',
      'series int d_series = bar_index - bar_index + 2',
    ];
    for (const left of qualifiers)
      for (const right of qualifiers) {
        lines.push(`q_${left}_${right} = n_${left} / d_${right}`, `plot(q_${left}_${right})`);
      }
    const ast = parse(lines.join('\n'));
    const checked = checkProgram(ast);
    expect(checked.diagnostics).toEqual([]);
    expect(checkSemanticTypeInvariants(ast, checked)).toEqual([]);
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots).toHaveLength(16);
    qualifiers.forEach((left, i) =>
      qualifiers.forEach((right, j) => {
        const integer = version <= 5 && left === 'const' && right === 'const';
        expect(result.plots[i * 4 + j]!.values, citation).toEqual(bars.map(() => (integer ? 2 : 2.5)));
        expect(checked.symbols.find((symbol) => symbol.name === `q_${left}_${right}`)?.type).toEqual({
          kind: integer ? 'int' : 'float',
          qualifier: qualifiers[Math.max(i, j)],
          ...(version >= 5 ? { integerDivision: true } : {}),
        });
      }),
    );
  });

  it('uses integer results in nested constant expressions and typed declarations', () => {
    const ast = parse(
      '//@version=5\nindicator("nested")\na = 5 / 2\nint b = (a + 3) / 2\nplot(b)\nplot(5.0 / 2)\nplot(5 / 2.0)',
    );
    expect(checkProgram(ast).diagnostics).toEqual([]);
    expect(executeScript(ast, bars).plots.map((plot) => plot.values)).toEqual([
      [2, 2, 2],
      [2.5, 2.5, 2.5],
      [2.5, 2.5, 2.5],
    ]);
  });

  it.each([
    ['-5 / 2', -2],
    ['5 / -2', -2],
    ['-5 / -2', 2],
  ])('truncates captured v5 %s toward zero', (expression, expected) => {
    const result = executeScript(
      parse(`//@version=5\nindicator("native signed division")\nplot(${expression})\nplot(1)`),
      bars,
    );
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([bars.map(() => expected), bars.map(() => 1)]);
  });

  it.each([
    ['-6 / 2', -3],
    ['-6 / -2', 3],
    ['6 / -2', -3],
    ['0 / -2', 0],
    ['-0 / 2', 0],
  ])('returns the exact integer for %s without choosing a rounding direction', (expression, expected) => {
    const ast = parse(
      `//@version=5\nindicator("exact division")\nint quotient = ${expression}\nplot(quotient)\nplot(1)`,
    );
    expect(checkProgram(ast).diagnostics).toEqual([]);
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([bars.map(() => expected), bars.map(() => 1)]);
  });

  it('keeps exact negative division through nested const UDF contexts', () => {
    const ast = parse(
      '//@version=5\nindicator("exact UDF division")\nhalf(x) => x / 2\nwrapper(x) => half(x)\nplot(wrapper(-6))\nplot(wrapper(0))',
    );
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [-3, -3, -3],
      [0, 0, 0],
    ]);
  });

  it('preserves negative fractional division for nonconst v5 integers', () => {
    const ast = parse(
      '//@version=5\nindicator("nonconst")\nn = input.int(-7)\nseries int s = bar_index - bar_index - 7\nplot(n / 2)\nplot(s / 2)',
    );
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [-3.5, -3.5, -3.5],
      [-3.5, -3.5, -3.5],
    ]);
  });

  it('does not treat an unrecorded typed-series qualifier as const', () => {
    const ast = parse(
      '//@version=5\nindicator("typed series")\nfloat value = -close\nplot(math.round(value * 100) / 100)',
    );
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots[0]!.values).toEqual([-10, -10, -10]);
  });

  it.each([false, true])('keeps UDF operand qualifiers per call, reversed=%s', (reversed) => {
    const calls = ['plot(f(5))', 'plot(f(bar_index + 5))'];
    if (reversed) calls.reverse();
    const ast = parse(`//@version=5\nindicator("UDF division")\nf(x) => x / 2\n${calls.join('\n')}`);
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    const expected = [
      [2, 2, 2],
      [2.5, 3, 3.5],
    ];
    if (reversed) expected.reverse();
    expect(result.plots.map((plot) => plot.values)).toEqual(expected);
  });

  it('passes qualifier contexts through nested UDF calls and local expressions', () => {
    const ast = parse(`//@version=5
indicator("nested UDF division")
half(x) => x / 2
wrapper(x) =>
    local = x + 0
    half(local)
plot(wrapper(5))
plot(wrapper(bar_index + 5))
plot(half(5.0))
plot(half(-7 + bar_index))`);
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [2, 2, 2],
      [2.5, 3, 3.5],
      [2.5, 2.5, 2.5],
      [-3.5, -3, -2.5],
    ]);
  });

  it.each(['5 / 2', '-7 / 2'])('handles division in a UDF called for side effects: %s', (expression) => {
    const ast = parse(
      `//@version=5\nindicator("UDF effects")\nf() =>\n    int value = ${expression}\n    log.info(str.tostring(value))\nf()\nplot(1)`,
    );
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.logs.map((log) => log.message)).toEqual(bars.map(() => (expression.startsWith('-') ? '-3' : '2')));
  });
});
