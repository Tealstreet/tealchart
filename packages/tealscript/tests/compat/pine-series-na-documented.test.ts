import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { type Bar } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

// Authority: https://www.tradingview.com/pine-script-reference/v6/.
// Each case names its entry; values below are derived from that entry, never captured.
const bars: Bar[] = [8, -3, 12, 0, -7].map((close, i) => ({
  time: 1_700_000_000_000 + i * 60_000,
  open: 1, high: Math.max(1, close), low: Math.min(1, close), close, volume: 100,
}));

function values(body: string, title = 'value', version = 6) {
  const result = runCompatScript(`//@version=${version}\nindicator("Documented series")\n${body}`, { bars });
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
  const data = getPlot(result, title).values;
  expect(data).toHaveLength(bars.length);
  // Pine's cited rules do not distinguish JavaScript's signed zero.
  return data.map((value) => value === 0 ? 0 : value);
}

const typedCases = [
  ['int', 'int', 'int(close)'],
  ['float', 'float', 'close'],
  ['color', 'color', 'color.red'],
  ['line', 'line', 'line.new(bar_index, close, bar_index + 1, close)'],
  ['label', 'label', 'label.new(bar_index, close)'],
  ['box', 'box', 'box.new(bar_index, close, bar_index + 1, close)'],
  ['table', 'table', 'table.new(position.top_left, 1, 1)'],
  ['array', 'array<float>', 'array.new<float>(1, close)'],
  ['matrix', 'matrix<float>', 'matrix.new<float>(1, 1, close)'],
  ['map', 'map<int, float>', 'map.new<int, float>()'],
] as const;

describe('documented typed na values', () => {
  // Red proof for EACH row: emitter.ts NaExpression emits 0 instead of NaN.
  // All ten assertions failed; restoring NaN made all ten pass.
  // Alternating missing/present values reject zero/empty defaults, always-na,
  // truthiness-based detection, and stale missing flags after reassignment.
  it.each(typedCases)('%s: typed na is detected and reassignment recovers (type entry + na series overload)', (_entry, type, present) => {
    expect(values(`${type} x = na\nif bar_index == 1 or bar_index == 3\n    x := ${present}\nplot(na(x) ? 1 : 0, "value")`)).toEqual([1, 0, 1, 0, 1]);
  });
});

describe('documented history', () => {
  // Reference: [] example (na at start), each type entry, na(series) overload.
  // Supporting authority: language/type-system/#bool (all non-bool missing history).
  // Red proof per row: NumericSeries.get / ValueSeries.get return 0 for missing
  // offsets; all nine fail on first bar, restore makes all pass.
  it.each(typedCases.filter(([entry]) => entry !== 'table'))('%s: unavailable history is na, present history recovers', (_entry, type, present) => {
    expect(values(`${type} x = ${present}\nplot(na(x[1]) ? 1 : 0, "value")`)).toEqual([1, 0, 0, 0, 0]);
  });

  // Reference: [] (previous values), - (elementwise expression).
  // Red proof: expression-history .get(idx) changed to .get(0); failed/restored/passed.
  // Zigzag values reject current-value, fixed seed, extrema, and wrong offset.
  it('derived expression history stores each preceding expression value', () => {
    expect(values('plot((close - open)[1], "value")')).toEqual([null, 7, -4, 11, -1]);
  });

  // Reference: [] and math.abs (absolute value), function-result series.
  // Same expression-history mutation; failed/restored/passed independently.
  it('function-result history stores preceding call results', () => {
    expect(values('plot(math.abs(close)[1], "value")')).toEqual([null, 8, 3, 12, 0]);
  });

  // Reference: [], array type, array.from, array.get; supporting arrays/#history-referencing.
  // Red proof: _historyCollection reads current instead of prior instance;
  // failed/restored/passed. Element 1 is a sentinel, not the prior bar's close.
  it('array history selects a previous instance rather than element indexing', () => {
    expect(values('a = array.from(close, 999.0)\nprevious = a[1]\nplot(na(previous) ? na : array.get(previous, 0), "value")')).toEqual([null, 8, -3, 12, 0]);
  });

  // Reference: [] and type; supporting migration guide/#history-of-udt-fields.
  // Red proof: ValueSeries.get reads offset 0; failed/restored/passed.
  it('historic UDT instance exposes the preceding field', () => {
    expect(values('type Sample\n    float price\nx = Sample.new(close)\nprevious = x[1]\nplot(na(previous) ? na : previous.price, "value")')).toEqual([null, 8, -3, 12, 0]);
  });

  // Reference: [] example; supporting v6 migration/#no-history-for-literal-values
  // explicitly documents the formerly valid v5 shape.
  // Red proof: expression-history .get(idx) -> .get(0); failed/restored/passed.
  it('v5 literal history is missing before the dataset', () => {
    expect(values('plot(42[2], "value")', 'value', 5)).toEqual([null, null, 42, 42, 42]);
  });

  // Reference: [] + na; supporting migration/#boolean-values-cannot-be-na.
  // Red proof: ValueSeries.get missing result -> 0; failed/restored/passed.
  it('v5 bool history preserves missing rather than false', () => {
    expect(values('bool x = close > open\nplot(na(x[1]) ? 2 : x[1] ? 1 : 0, "value")', 'value', 5)).toEqual([2, 1, 0, 1, 0]);
  });
});

describe('documented na replacement', () => {
  // Reference: nz(source, replacement) -> series int, default 0; preserve non-na.
  // Red proof: _nz default 0 changed to 99; failed, restored, passed.
  it('nz(): int default preserves negative and zero samples', () => {
    expect(values('int x = bar_index == 0 or bar_index == 2 ? na : int(close)\nplot(nz(x), "value")')).toEqual([0, -3, 0, 0, -7]);
  });

  // Reference: fixnan(source) -> series color, nearest preceding non-na.
  // Red proof: fixnan missing branch emits NaN instead of stored color;
  // failed on gap bars, restored, passed. Different colors reject first/max/last-only.
  it('fixnan(): color holes retain the nearest color and recover', () => {
    expect(values('color x = bar_index == 0 ? color.red : bar_index == 3 ? color.blue : na\ny = fixnan(x)\nplot(y == color.red ? 1 : y == color.blue ? 2 : 0, "value")')).toEqual([1, 1, 1, 2, 2]);
  });
});

describe('documented missing arithmetic and comparisons', () => {
  // Reference: -, *, /, unary + and - entries; supporting operators/#arithmetic-operators.
  // Modulo is deliberately excluded: reference % remarks contradict the manual.
  // Red proof per case: NaExpression emitted 0; every case failed, restored/passed.
  // Interior gaps, negative values, zero and recovery reject zero filling, stale
  // values, abs/sign loss, and poisoning the entire result after the first gap.
  it.each([
    ['-', 'x - 2', [null, -5, null, -2, -9]],
    ['*', 'x * 2', [null, -6, null, 0, -14]],
    ['/', 'x / 2', [null, -1.5, null, 0, -3.5]],
    ['unary +', '+x', [null, -3, null, 0, -7]],
    ['unary -', '-x', [null, 3, null, 0, 7]],
  ] as const)('%s propagates na and resumes on finite input', (_entry, expression, expected) => {
    expect(values(`float x = bar_index == 0 or bar_index == 2 ? na : close\nplot(${expression}, "value")`)).toEqual(expected);
    if (_entry === '-' || _entry === '*' || _entry === '/') {
      expect(values(`float x = bar_index == 0 or bar_index == 2 ? na : close\nplot(na(2 ${_entry} (x + 1)) ? 1 : 0, "value")`)).toEqual([1, 0, 1, 0, 0]);
    }
  });

  // Reference: < and <=; supporting type-system/#na-value explicitly says false.
  // Red proof per case: _cmp missing-operand return false -> true; failed/restored/passed.
  // Both operand orders, both-na, equality and finite signs reject JS coercion,
  // treating missing as true/zero, and accidentally changing strictness.
  it.each([
    ['<', [0, 10, 0, 0, 10]],
    ['<=', [0, 10, 0, 11, 10]],
  ] as const)('v6 %s returns false for missing operands', (operator, expected) => {
    expect(values(`float x = bar_index == 0 or bar_index == 2 ? na : close\nfloat missing = na\nplot((x ${operator} 0 ? 10 : 0) + (0 ${operator} x ? 1 : 0) + (missing ${operator} missing ? 100 : 0), "value")`)).toEqual(expected);
  });

  // Reference: >=, <, <= and na; supporting v5 operators/#comparison-operators
  // and migration/#boolean-values-cannot-be-na establish the legacy third state.
  // Red proof per case: _cmpLegacyNa missing return NaN -> false; failed/restored/passed.
  it.each(['>=', '<', '<='])('v5 %s retains boolean na on either operand', (operator) => {
    expect(values(`float x = bar_index == 0 or bar_index == 2 ? na : close\nplot((na(x ${operator} 0) ? 10 : 0) + (na(0 ${operator} x) ? 1 : 0), "value")`, 'value', 5)).toEqual([11, 0, 11, 0, 0]);
  });
});

describe('documented na helper version boundaries', () => {
  // Reference: na(x), nz(source,replacement), fixnan(source) allowed types;
  // supporting migration/#boolean-values-cannot-be-na explicitly removes bool.
  // Red proof EACH: v6 allowsBoolNaHelpers false -> true; refusal disappears;
  // restored rule yields the expected named type-mismatch diagnostic.
  it.each(['na', 'nz', 'fixnan'])('%s rejects v6 bool arguments', (name) => {
    const checked = checkProgram(parse(`//@version=6\nindicator("Bool helper")\nbool x = close > open\ny = ${name}(x)`));
    expect(checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([
      expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining(`${name} `) }),
    ]);
  });

  // Reference: na variable and int/float type Remarks require an explicit type.
  // Red proof: allowsUntypedNaDeclaration v6 false -> true; failed/restored/passed.
  it('na: untyped initialization is refused with a type diagnostic', () => {
    const checked = checkProgram(parse('//@version=6\nindicator("Untyped")\nx = na\nplot(x)'));
    expect(checked.diagnostics).toContainEqual(expect.objectContaining({
      code: 'version-mismatch', message: expect.stringContaining('Untyped declarations initialized with na'),
    }));
    expect(checkProgram(parse('//@version=6\nindicator("Typed")\nfloat x = na\nplot(x)')).diagnostics).toEqual([]);
  });

  // Reference: na(x) -> bool; migration guide explicitly gives all three v5 states.
  // Red proof: NaExpression -> 0; failed/restored/passed.
  it('na(): v5 bool distinguishes na, false and true', () => {
    expect(values('bool x = bar_index == 1 or bar_index == 3 ? na : close > open\nplot(na(x) ? 2 : x ? 1 : 0, "value")', 'value', 5)).toEqual([1, 2, 1, 2, 0]);
  });

  // Reference: nz(source,replacement) preserves source; v5 bool overload from migration.
  // Red proof: _nz returns v for missing instead of replacement; failed/restored/passed.
  // Both replacements check that false is preserved and na takes the requested value.
  it('nz(): v5 bool replacement preserves false and true', () => {
    expect(values('bool x = bar_index == 1 or bar_index == 3 ? na : close > open\nplot((nz(x, true) ? 10 : 0) + (nz(x, false) ? 1 : 0), "value")', 'value', 5)).toEqual([11, 10, 11, 10, 0]);
  });

  // Reference: fixnan nearest previous non-na; legacy bool overload from migration.
  // Red proof: fixnan gap branch -> NaN; failed/restored/passed.
  // false becomes the retained value after bar 2, rejecting truthiness-based storage.
  it('fixnan(): v5 bool fills gaps with the nearest true or false', () => {
    expect(values('bool x = bar_index == 1 or bar_index == 3 ? na : close > open and bar_index == 0\ny = fixnan(x)\nplot(na(y) ? 2 : y ? 1 : 0, "value")', 'value', 5)).toEqual([1, 1, 0, 0, 0]);
  });
});

describe('documented remaining type and initialization behavior', () => {
  // Reference: enum / type, na variable and [] example; supporting type-system/#bool.
  // Red proof representation cases: NaExpression -> 0. History cases:
  // ValueSeries.get missing offset -> 0. Each failed/restored/passed.
  it.each([
    ['enum', 'enum Choice\n    first\n    second', 'Choice', 'Choice.second'],
    ['UDT', 'type Sample\n    float price', 'Sample', 'Sample.new(close)'],
  ])('%s na representation recovers after assignment', (_entry, declaration, type, present) => {
    expect(values(`${declaration}\n${type} x = na\nif bar_index == 1 or bar_index == 3\n    x := ${present}\nplot(na(x) ? 1 : 0, "value")`)).toEqual([1, 0, 1, 0, 1]);
  });

  it.each([
    ['enum', 'enum Choice\n    first\n    second', 'Choice', 'Choice.second'],
    ['UDT', 'type Sample\n    float price', 'Sample', 'Sample.new(close)'],
  ])('%s unavailable history is na', (_entry, declaration, type, present) => {
    expect(values(`${declaration}\n${type} x = ${present}\nplot(na(x[1]) ? 1 : 0, "value")`)).toEqual([1, 0, 0, 0, 0]);
  });

  // V56 v5/v6 Empty_NA_Control is 1 on every captured bar.
  // Empty arrays and matrices retain the documented present-reference controls.
  it('na(): empty string is missing and empty reference objects are present', () => {
    expect(values('string text = ""\na = array.new<float>()\nm = matrix.new<float>(0, 0)\nplot((na(text) ? 1 : 0) + (na(a) ? 10 : 0) + (na(m) ? 100 : 0), "value")')).toEqual([1, 1, 1, 1, 1]);
  });

  // Reference: var example b retains the FIRST green bar's close, even though
  // the scope is first reached after bar zero. Alternating values reject
  // global first-bar init, reinitializing per visit, and holding a max/min.
  // Red proof: persistent local if (!initFlag) -> if (true); failed/restored/passed.
  it('var: local initialization occurs only when first reached', () => {
    expect(values('var float selected = na\nif bar_index == 1 or bar_index == 2 or bar_index == 4\n    var float first = close\n    selected := first\nplot(selected, "value")')).toEqual([null, -3, -3, -3, -3]);
  });

  // Reference: [] example a := a[1] starts na; supporting operators discussion
  // says unchecked na can affect all later calculations. Finite inputs never
  // rescue a persistent missing accumulator without an explicit replacement.
  // Red proof: NaExpression -> 0; failed/restored/passed.
  it('na: a persistent recurrence remains poisoned without nz', () => {
    expect(values('var float total = na\ntotal += close\nplot(total, "value")')).toEqual([null, null, null, null, null]);
  });
});
