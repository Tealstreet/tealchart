import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript, type Bar } from '../../src/runtime';
import { getPlot } from './fixtures';

// Authority: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json.
// Ledger: type-qualifier-system-v1. All vectors are calculated from the cited
// definitions and explicit script branches, never captured from engine output.
const closes = [-2.8, 0, 5.9, -0.4, 2.2, -7.6];
const bars: Bar[] = closes.map((close, index) => ({
  time: 1_700_000_000_000 + index * 60_000,
  open: close + 0.5, high: close + 1, low: close - 1, close, volume: 10,
}));

function values(body: string, inputs?: Map<string, unknown>) {
  const result = executeScript(parse('//@version=6\nindicator("Documented missing values")\n' + body), bars, inputs);
  expect(result.errors).toEqual([]);
  return getPlot(result, 'Value').values.map((value) => value === 0 ? 0 : value);
}

describe('documented explicit numeric casts', () => {
  // Reference function/int description: truncates float value, not floor/round.
  // RED: emitter int lowering used Math.floor; observed fail, restored pass.
  it('int truncates positive and negative fractional values toward zero', () => {
    expect(values('plot(int(close), title="Value")')).toEqual([-2, 0, 5, 0, 2, -7]);
  });

  // Reference function/float description/return. Rejects rounding or discarding
  // existing fractions. RED: emitter float lowering returned zero; failed/pass.
  it('float preserves signed numeric values and existing fractional parts', () => {
    expect(values('plot(float(close), title="Value")')).toEqual(closes);
  });

  // Reference function/bool description: na, false and zero -> false; others true.
  // Rejects positive-only truthiness and treating na as true. RED: bool lowering
  // used x > 0; failed on negatives, restored pass.
  it('bool accepts negative nonzero numbers but refuses zero, false and na', () => {
    expect(values('plot(bool(close) ? 1 : 0, title="Value")')).toEqual([1, 0, 1, 1, 1, 1]);
    expect(values('plot(bool(na) or bool(false) or bool(0) ? 1 : 0, title="Value")')).toEqual([0, 0, 0, 0, 0, 0]);
    expect(values('plot(bool(true) ? 1 : 0, title="Value")')).toEqual([1, 1, 1, 1, 1, 1]);
  });
});

describe('documented typed missing values', () => {
  // Each function/<type> description explicitly casts na; function/na series
  // overload accepts all these types. RED for every passing cast: generated
  // _isNa always returned false; observed each fail and pass after restoration.
  // string(na) is naturally RED: it produces the defined string "NaN" instead
  // of a missing string. Open defect TYPE-STRING-NA-CAST. INVERSE: isolated
  // emitter guarded String(x) with _isNa(x), returning NaN for missing x;
  // the assertion passed as an ordinary test, then the copy was discarded.
  for (const type of ['int', 'float', 'color', 'string', 'line', 'linefill', 'label', 'box', 'table']) {
    const test = it;
    test(`${type === 'string' ? '[TYPE-STRING-NA-CAST] ' : ''}casting na to ${type} preserves missingness [function/${type}, function/na]`, () => {
      expect(values(`value = ${type}(na)\nplot(na(value) ? 1 : 0, title="Value")`)).toEqual([1, 1, 1, 1, 1, 1]);
    });
  }

  // Reference variable/na remarks and type/<type> remarks: an explicit type gives
  // na its context. function/na returns true only for missing values. Defined
  // zero, transparent black and empty string reject falsey-is-missing readings.
  // RED for each: _isNa always false; failed on first missing bar, restored pass.
  for (const entry of [
    { type: 'int', defined: '0' },
    { type: 'float', defined: '0.0' },
    { type: 'color', defined: '#00000000' },
    { type: 'string', defined: '""' },
  ]) {
    it(`${entry.type} na initialization differs from a defined falsey value`, () => {
      expect(values(`var ${entry.type} value = na\nif bar_index == 1\n    value := ${entry.defined}\nplot(na(value) ? 1 : 0, title="Value")`)).toEqual([1, 0, 0, 0, 0, 0]);
    });
  }
});

describe('documented missing-value replacements', () => {
  // Reference function/nz replacement parameter: defaults 0, 0.0, #00000000.
  // Alternating defined negative/zero/positive values rejects always-default
  // behavior and falsey testing. RED: _nz discarded every defined source and
  // returned its default; all default and explicit cases failed, restored pass.
  it('nz int defaults missing values to zero and preserves defined integers', () => {
    expect(values('value = bar_index % 2 == 0 ? int(na) : int(close)\nplot(nz(value), title="Value")')).toEqual([0, 0, 0, 0, 0, -7]);
  });

  it('nz float defaults missing values to zero and preserves fractional values', () => {
    expect(values('value = bar_index % 2 == 0 ? float(na) : close\nplot(nz(value), title="Value")')).toEqual([0, 0, 0, -0.4, 0, -7.6]);
  });

  // Natural RED: generated _nz uses numeric zero for a missing color.
  // Open defect TYPE-NZ-COLOR-DEFAULT. Reference explicitly specifies transparent
  // black; test all four channels, including transparency, rather than RGB alone.
  // INVERSE: isolated emitter selected #00000000 for color-typed sources using
  // checker symbol kinds. All four channel assertions passed; copy discarded.
  it('[TYPE-NZ-COLOR-DEFAULT] nz color defaults to transparent black and preserves a defined color', () => {
    const body = 'value = bar_index % 2 == 0 ? color(na) : #123456ff\nfilled = nz(value)\n';
    for (const [channel, missing, defined] of [['r', 0, 18], ['g', 0, 52], ['b', 0, 86], ['t', 100, 0]] as const) {
      expect(values(body + `plot(color.${channel}(filled), title="Value")`)).toEqual([missing, defined, missing, defined, missing, defined]);
    }
  });

  // Reference function/nz color overload; source need not be an identifier.
  // RED: color default was replaced with numeric zero; both cases failed, restored passed.
  for (const [name, body] of [
    ['conditional expression', 'filled = nz(source=bar_index % 2 == 0 ? color(na) : #123456ff)\n'],
    ['typed function parameter', 'fill(color source) => nz(source)\nvalue = bar_index % 2 == 0 ? color(na) : #123456ff\nfilled = fill(value)\n'],
  ]) {
    it(`nz color defaults to transparent black for a ${name} [function/nz]`, () => {
      for (const [channel, missing, defined] of [['r', 0, 18], ['g', 0, 52], ['b', 0, 86], ['t', 100, 0]] as const) {
        expect(values(body + `plot(color.${channel}(filled), title="Value")`)).toEqual([missing, defined, missing, defined, missing, defined]);
      }
    });
  }

  // Reference function/nz float overload: a missing numeric source defaults to zero.
  // RED: every nz source was treated as color; numeric shadow case failed, restored passed.
  it('nz keeps numeric defaults when a parameter shadows a color variable [function/nz, type/float]', () => {
    const body = 'color value = color(na)\nfill(float value) => nz(value)\nplot(fill(bar_index % 2 == 0 ? float(na) : close), title="Value")';
    expect(values(body)).toEqual([0, 0, 0, -0.4, 0, -7.6]);
  });

  for (const entry of [
    { type: 'int', replacement: '-11', expression: 'int(close)', expected: [-11, 0, -11, 0, -11, -7] },
    { type: 'float', replacement: '-11.25', expression: 'close', expected: [-11.25, 0, -11.25, -0.4, -11.25, -7.6] },
    { type: 'color', replacement: '#112233', expression: '#445566', expected: [17, 68, 17, 68, 17, 68] },
  ]) {
    it(`nz ${entry.type} uses its explicit replacement only when missing [function/nz]`, () => {
      const output = entry.type === 'color' ? 'color.r(filled)' : 'filled';
      expect(values(`value = bar_index % 2 == 0 ? ${entry.type}(na) : ${entry.expression}\nfilled = nz(value, ${entry.replacement})\nplot(${output}, title="Value")`)).toEqual(entry.expected);
    });
  }

  // Reference function/fixnan: previous NEAREST non-NaN, not greatest, first,
  // zero or interpolation. Two calls reject sharing one accumulator per builtin.
  // RED: emitter fixnan returned current value (no carry); all three failed/pass.
  for (const entry of [
    { type: 'float', expression: 'close', expected: [null, 0, 0, -0.4, -0.4, -7.6] },
    { type: 'int', expression: 'int(close)', expected: [null, 0, 0, 0, 0, -7] },
    { type: 'color', expression: 'bar_index == 1 ? #ff0000 : bar_index == 3 ? #220000 : #990000', expected: [null, 255, 255, 34, 34, 153] },
  ]) {
    it(`fixnan ${entry.type} carries the nearest previous defined value [function/fixnan]`, () => {
      const output = entry.type === 'color' ? 'color.r(filled)' : 'filled';
      expect(values(`value = bar_index % 2 == 0 ? ${entry.type}(na) : ${entry.expression}\nfilled = fixnan(value)\nother = fixnan(bar_index % 2 == 1 ? float(na) : close)\nplot(${output}, title="Value")`)).toEqual(entry.expected);
    });
  }
});

describe('captured absolute-difference float comparisons', () => {
  // Native v4 native-float-comparison-boundary-v1 overrides the manual's 9dp rule.
  // All differences here exceed the captured inclusive 1e-10 tolerance.
  for (const operator of ['==', '!=']) {
    it(`native ${operator} distinguishes signed differences above 1e-10`, () => {
      const comparisons = [
        ['1.0000000001', '1.0000000004', false],
        ['1.0000000004', '1.0000000006', false],
        ['-1.0000000001', '-1.0000000004', false],
        ['-1.0000000004', '-1.0000000006', false],
        ['1.000000001', '1.000000002', false],
      ] as const;
      for (const [left, right, equal] of comparisons) {
        const expected = operator === '==' ? equal : !equal;
        expect(values(`plot(${left} ${operator} ${right} ? 1 : 0, title="Value")`)).toEqual(Array(6).fill(expected ? 1 : 0));
      }
    });
  }
});

// Native v4 signed/nonzero comparison masks supersede the manual's 9dp rounding.
for (const [operator, expected] of [
  ['>', [0, 1, 1, 0, 0, 1]],
  ['<', [1, 0, 0, 1, 1, 0]],
  ['>=', [0, 1, 1, 0, 0, 1]],
  ['<=', [1, 0, 0, 1, 1, 0]],
] as const) {
  it(`native relational ${operator} distinguishes signed differences above 1e-10`, () => {
    const body = `x = array.from(1.0000000001, 1.0000000004, -1.0000000001, -1.0000000004, 1.0000000004, -1.0000000004)
y = array.from(1.0000000004, 1.0000000001, -1.0000000004, -1.0000000001, 1.0000000006, -1.0000000006)
plot(array.get(x, bar_index) ${operator} array.get(y, bar_index) ? 1 : 0, title="Value")`;
    expect(values(body)).toEqual(expected);
  });
}
