import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import type { Bar } from '../../src/runtime/context';
import { checkProgram } from '../../src/semantic/checker';

// Authority: archived pine-v6-reference-v1.json entries bool, na, nz, fixnan,
// and, or, ?:, and []; version distinctions come from the official guides:
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/
// #explicit-bool-casting, #boolean-values-cannot-be-na,
// #lazy-evaluation-of-conditions; and to-pine-version-5/#removed-iff-and-offset.
const bars: Bar[] = [0, -3, 0.25, 0].map((close, index) => ({
  time: (index + 1) * 60_000,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 10,
}));

function source(version: number, body: string): string {
  return `//@version=${version}\nindicator("Version boolean reference")\n${body}`;
}

function plots(version: number, body: string): (number | null)[][] {
  const ast = parse(source(version, body));
  expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  const result = executeScript(ast, bars);
  expect(result.errors).toEqual([]);
  expect(result.plots.length).toBeGreaterThan(0);
  for (const plot of result.plots) expect(plot.values).toHaveLength(bars.length);
  return result.plots.map((plot) => plot.values);
}

describe('documented Pine version boolean boundaries', () => {
  // Reference bool(x): zero/na/false are false; negative and fractional nonzero
  // values are true. Rejects JS Boolean(NaN), positive-only and int-truncation.
  it.each([5, 6])('casts all numeric truth states explicitly in v%i [bool]', (version) => {
    expect(plots(version, `plot(bool(close) ? 7 : -2)
plot(bool(close[1]) ? 7 : -2)
plot(bool(false) ? 7 : -2)
plot(bool(true) ? 7 : -2)`)).toEqual([
      [-2, 7, 7, -2], [-2, -2, 7, 7], [-2, -2, -2, -2], [7, 7, 7, 7],
    ]);
  });

  // Migration #explicit-bool-casting, reference bool and ?:.
  it('uses zero/na/nonzero numeric conditions implicitly in v5 [bool, ?:]', () => {
    expect(plots(5, `plot(close ? 7 : -2)
plot(close[1] ? 7 : -2)`)).toEqual([[-2, 7, 7, -2], [-2, -2, 7, 7]]);
  });

  it.each([
    ['ternary', 'plot(close ? 7 : -2)'],
    ['if', 'if close\n    label.new(bar_index, close)'],
    ['while', 'while close\n    break'],
    ['and', 'plot((close and true) ? 7 : -2)'],
    ['or', 'plot((false or close) ? 7 : -2)'],
  ])('requires an explicit numeric cast in v6 %s [bool]', (_name, body) => {
    const diagnostics = checkProgram(parse(source(6, body))).diagnostics;
    expect(diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ severity: 'error', message: expect.stringMatching(/Numeric .*boolean in Pine v6/) }),
    ]));
  });

  // Each helper has a separate reference signature excluding bool in v6.
  // Include the v5 positive control, so uniformly rejecting bool cannot pass.
  it.each(['na', 'nz', 'fixnan'])('removes only the modern bool overload of %s', (helper) => {
    const body = `bool value = close > 0\nresult = ${helper}(value)`;
    expect(checkProgram(parse(source(5, body))).diagnostics).toEqual([]);
    expect(checkProgram(parse(source(6, body))).diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ severity: 'error', message: expect.stringContaining(`${helper} ${helper === 'na' ? 'x' : 'source'} cannot be a boolean`) }),
    ]));
  });

  // Reference bool; migration #boolean-values-cannot-be-na. Separate initializer,
  // reassignment and UDF default checks prevent partial enforcement from passing.
  it.each([
    ['assignment', 'bool value = false\nvalue := na'],
  ])('forbids bool na only in v6 %s [bool, na]', (_name, body) => {
    expect(checkProgram(parse(source(5, body))).diagnostics).toEqual([]);
    expect(checkProgram(parse(source(6, body))).diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ severity: 'error', message: expect.stringContaining('does not allow boolean na') }),
    ]));
  });

  // Reference na/nz/fixnan; legacy overloads in migration #boolean-values-cannot-be-na.
  // Interleave na, true and false: a helper cannot substitute truthiness for na,
  // always return its replacement, or accidentally discard false as missing.
  it('preserves the three legacy bool states through na/nz/fixnan in v5', () => {
    expect(plots(5, `bool value = bar_index == 0 or bar_index == 3 ? na : close > 0
plot(na(value) ? 9 : value ? 7 : -2)
plot(nz(value, true) ? 7 : -2)
plot(nz(value, false) ? 7 : -2)
plot(na(fixnan(value)) ? 9 : fixnan(value) ? 7 : -2)`)).toEqual([
      [9, -2, 7, 9], [7, -2, 7, 7], [-2, -2, 7, -2], [9, -2, 7, 7],
    ]);
  });

  // Reference [] and bool; missing history is na in v5, false in v6.
  // Equality to false distinguishes false from na even though both are false
  // as conditions. True/false transitions catch a constant or off-by-one history.
  it.each([5])('observes the first-bar bool history state in v%i [[], bool]', (version) => {
    expect(plots(version, `bool value = close > 0
bool previous = value[1]
plot(previous == false ? 7 : -2)
plot(previous ? 7 : -2)`)).toEqual([
      version === 5 ? [-2, 7, 7, -2] : [7, 7, 7, -2],
      [-2, -2, -2, 7],
    ]);
  });
});

describe('named boolean version defects', () => {
  // Reference bool and na; the v5/v6 pair rejects version-independent enforcement.
  it('V6_BOOL_NA_INITIALIZER_ACCEPTED [bool, na]', () => {
    const body = 'bool value = na';
    expect(checkProgram(parse(source(5, body))).diagnostics).toEqual([]);
    expect(checkProgram(parse(source(6, body))).diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ severity: 'error', message: expect.stringContaining('does not allow boolean na') }),
    ]));
  });

  // Reference bool/na; migration #boolean-values-cannot-be-na.
  // Legacy defaults preserve na without discarding explicit false/true calls.
  it('V5_BOOL_NA_UDF_DEFAULT_REFUSED [bool, na]', () => {
    const body = 'f(bool value = na) => value\nresult = f()';
    expect(checkProgram(parse(source(5, body))).diagnostics).toEqual([]);
    expect(checkProgram(parse(source(6, body))).diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ severity: 'error', message: expect.stringContaining('does not allow boolean na') }),
    ]));
    expect(plots(5, `f(bool value = na) => value
plot(na(f()) ? 9 : -2)
plot(f(false) ? 7 : -2)
plot(f(true) ? 7 : -2)`)).toEqual([[9, 9, 9, 9], [-2, -2, -2, -2], [7, 7, 7, 7]]);
  });

  // Reference [] and bool; migration #boolean-values-cannot-be-na.
  // Lane C normalizes missing typed-bool series history to false in v6.
  it('missing V6 typed-boolean history returns false [[], bool]', () => {
    expect(plots(6, `bool value = close > 0
bool previous = value[1]
plot(previous == false ? 7 : -2)
plot(previous ? 7 : -2)`)).toEqual([[7, 7, 7, -2], [-2, -2, -2, 7]]);
  });
});

describe('documented branch evaluation', () => {
  // Reference and/or remarks; migration #lazy-evaluation-of-conditions.
  // Side effects expose skipped RHS calls; alternating the LHS ensures a
  // blanket "never evaluate RHS" or eager implementation also fails.
  it.each(['and', 'or'])('evaluates the v6 %s RHS exactly when needed', (operator) => {
    expect(plots(6, `var calls = array.new_int(1, 0)
visit() =>
    array.set(calls, 0, array.get(calls, 0) + 1)
    true
bool value = (close > 0) ${operator} visit()
plot(value ? 7 : -2)
plot(array.get(calls, 0))`)).toEqual(operator === 'and'
      ? [[-2, -2, 7, -2], [0, 0, 1, 1]]
      : [[7, 7, 7, 7], [1, 2, 2, 3]]);
  });

  // Reference ?: and migration to v5 #removed-iff-and-offset.
  // Different increments identify which branch ran; both conditions occur.
  it.each([5, 6])('evaluates only the selected ternary branch in v%i [?:]', (version) => {
    expect(plots(version, `var calls = array.new_int(1, 0)
visit(int delta) =>
    array.set(calls, 0, array.get(calls, 0) + delta)
    delta
value = close > 0 ? visit(3) : visit(11)
plot(value)
plot(array.get(calls, 0))`)).toEqual([[11, 11, 3, 11], [11, 22, 25, 36]]);
  });

  // The current v6 reference has no iff entry (removed in v5); its replacement
  // is ?: and the v5 guide explicitly documents eager legacy iff evaluation.
  it('evaluates both legacy iff branches in v4 [?: replacement]', () => {
    expect(plots(4, `var calls = array.new_int(1, 0)
visit(int delta) =>
    array.set(calls, 0, array.get(calls, 0) + delta)
    delta
value = iff(close > 0, visit(3), visit(11))
plot(value)
plot(array.get(calls, 0))`)).toEqual([[11, 11, 3, 11], [14, 28, 42, 56]]);
  });
});

describe('named eager evaluation version defects', () => {
  // Reference and/or; migration #lazy-evaluation-of-conditions.
  // Side effects expose each skipped RHS while paired v6 cases retain laziness.
  // Natural red: v5 used the same short-circuit lowering as v6.
  it.each(['and', 'or'])('V5_LOGICAL_RHS_SHORT_CIRCUITED: %s', (operator) => {
    expect(plots(5, `var calls = array.new_int(1, 0)
visit() =>
    array.set(calls, 0, array.get(calls, 0) + 1)
    true
bool value = (close > 0) ${operator} visit()
plot(value ? 7 : -2)
plot(array.get(calls, 0))`)).toEqual([
      operator === 'and' ? [-2, -2, 7, -2] : [7, 7, 7, 7],
      [1, 2, 3, 4],
    ]);
  });
});
