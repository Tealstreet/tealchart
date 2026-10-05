import { beforeAll, describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: official pine-v6-reference-v1.json, captured 2026-10-03.
// Every case names an entry and derives its expectation from that entry's rule.
// No engine output is used as an oracle. Numeric branch values are intentionally

// nonmonotonic and signed to distinguish last/first/max/min/sum interpretations.
// Red proof: inverted boolean operations (3), eager operands (2), inverted if
// conditions (2), wrong switch comparison/order (3), reinitialized var (2),

// cached regular initializer (1), wrong function argument/return/default (3).
// All 16 failed under targeted emitter mutations, then passed after restoration.
// Inverse proof: a discarded source copy with boolean empty if values and

// declaration-tail returns passed all 18 ordinary assertions, including the
// two named expected-red cases below with it.fails disabled.
const reference = 'https://www.tradingview.com/pine-script-reference/v6/';
const allBars = (value: number | null) => compatibilityBars.map(() => value);

interface ValueCase {
  name: string;
  entry: string;
  rule: string;
  rejects: string;
  body: string;
  expected: Array<number | null>;
  openDefect?: string;
}

const cases: ValueCase[] = [
  {
    name: 'and implements all four boolean combinations',
    entry: 'kw_and',
    rule: 'description: logical conjunction',
    rejects: 'or, xor, left-only, right-only, negated conjunction',
    body: `mask = (false and false ? 1 : 0) + (false and true ? 2 : 0) + (true and false ? 4 : 0) + (true and true ? 8 : 0)
plot(mask, "Result")`,
    expected: allBars(8),
  },
  {
    name: 'or implements all four boolean combinations',
    entry: 'kw_or',
    rule: 'description: logical disjunction',
    rejects: 'and, xor, left-only, right-only, negated disjunction',
    body: `mask = (false or false ? 1 : 0) + (false or true ? 2 : 0) + (true or false ? 4 : 0) + (true or true ? 8 : 0)
plot(mask, "Result")`,
    expected: allBars(14),
  },
  {
    name: 'not negates both boolean values',
    entry: 'kw_not',
    rule: 'description: logical negation',
    rejects: 'identity, constant true, constant false',
    body: `mask = (not false ? 1 : 0) + (not true ? 2 : 0)
plot(mask, "Result")`,
    expected: allBars(1),
  },
  {
    name: 'and evaluates the right operand only when the left is true',
    entry: 'kw_and',
    rule: 'remarks[0]: false left operand skips expr2',
    rejects: 'eager evaluation, always skipping expr2, dropping expr2 result',
    body: `touch(array<int> seen) =>
    array.push(seen, 1)
    true
seen = array.new<int>()
value = close > open and touch(seen)
plot(array.size(seen) * 10 + (value ? 1 : 0), "Result")`,
    expected: [11, 11, 11, 0, 0, 11, 11, 11, 0, 11, 0, 11],
  },
  {
    name: 'or evaluates the right operand only when the left is false',
    entry: 'kw_or',
    rule: 'remarks[0]: true left operand skips expr2',
    rejects: 'eager evaluation, always skipping expr2, dropping expr2 result',
    body: `touch(array<int> seen) =>
    array.push(seen, 1)
    true
seen = array.new<int>()
value = close > open or touch(seen)
plot(array.size(seen) * 10 + (value ? 1 : 0), "Result")`,
    expected: [1, 1, 1, 11, 11, 1, 1, 1, 11, 1, 11, 1],
  },
  {
    name: 'if else-if selects the first matching block and its last expression',
    entry: 'kw_if',
    rule: 'detailedDesc: conditional blocks, else-if, final expression',
    rejects: 'last matching branch, max/min/first/sum tail, unconditional else',
    body: `result = if bar_index == 0
    8
    -5
else if bar_index < 2
    -9
    3
else
    7
    -2
plot(result, "Result")`,
    expected: [-5, 3, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2],
  },
  {
    name: 'if without else supplies na for an unmatched numeric result',
    entry: 'kw_if',
    rule: 'detailedDesc and numeric no-else example: unmatched result is na',
    rejects: 'zero, evaluated unselected tail, stale previous branch value',
    body: `result = if bar_index == 0
    -5
plot(result, "Result")`,
    expected: [-5, null, null, null, null, null, null, null, null, null, null, null],
  },
  {
    name: 'if without else supplies false for an unmatched boolean result',
    entry: 'kw_if',
    rule: 'detailedDesc: empty values are na, false, or empty string according to type',
    rejects: 'na masquerading as false in a condition, stale true, unevaluated tail',
    body: `bool value = if bar_index == 0
    true
plot(str.tostring(value) == "false" ? 1 : 0, "Result")`,
    expected: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  },
  {
    name: 'if returns a final variable declaration value',
    entry: 'kw_if',
    rule: 'detailedDesc: a declaration at the end returns its declared value',
    rejects: 'na for declaration tails, first declaration, max/min/sum of declarations',
    body: `result = if bar_index == 0
    first = 8
    last = -5
else
    first = -9
    last = 3
plot(result, "Result")`,
    expected: [-5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
  },
  {
    name: 'switch with a key selects a case or the default',
    entry: 'kw_switch',
    rule: 'first example and remarks: matching key selects one block, default only if none match',
    rejects: 'positional arm selection, ignored key, default unconditionally, fallthrough',
    body: `key = bar_index == 0 ? "second" : bar_index == 1 ? "first" : "missing"
result = switch key
    "first" => -5
    "second" => 3
    => -2
plot(result, "Result")`,
    expected: [3, -5, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2],
  },
  {
    name: 'switch condition form executes only the first matching block',
    entry: 'kw_switch',
    rule: 'remarks: only one local_block can execute; returns: last expression of that block',
    rejects: 'last-match selection, eager arm evaluation, fallthrough, default side effects',
    body: `seen = array.new<int>()
result = switch
    true =>
        array.push(seen, 4)
        -5
    true =>
        array.push(seen, 1)
        3
    =>
        array.push(seen, 7)
        -2
plot(result * 10 + array.sum(seen), "Result")`,
    expected: allBars(-46),
  },
  {
    name: 'switch without a default supplies na for an unmatched numeric result',
    entry: 'kw_switch',
    rule: 'remarks: no default and no matching local block returns na',
    rejects: 'zero, stale prior result, last arm selected unconditionally',
    body: `result = switch bar_index
    0 => -5
plot(result, "Result")`,
    expected: [-5, null, null, null, null, null, null, null, null, null, null, null],
  },
  {
    name: 'var initializes once using the first bar rather than an extremum',
    entry: 'kw_var',
    rule: 'detailedDesc: a keeps the closing price of the first bar',
    rejects: 'reinitialization, final/min/max close, zero seed',
    body: `var first = close
plot(first, "Result")`,
    expected: allBars(102),
  },
  {
    name: 'regular declarations reinitialize on every bar',
    entry: 'kw_var',
    rule: 'description: declarations without var overwrite their value on every update',
    rejects: 'one-time initialization, accumulated changes, previous-bar evaluation',
    body: `value = close
value += 7
plot(value, "Result")`,
    expected: [109, 112, 114, 110, 106, 107, 111, 116, 115, 118, 117, 119],
  },
  {
    name: 'local var initializes on the first execution of its conditional block',
    entry: 'kw_var',
    rule: 'example and detailedDesc: nested var captures the first bar satisfying its condition',
    rejects: 'global first-bar capture, reinitialization, hoisting the conditional initializer',
    body: `var float result = na
if bar_index >= 2
    var captured = close
    result := captured
plot(result, "Result")`,
    expected: [null, null, 107, 107, 107, 107, 107, 107, 107, 107, 107, 107],
  },
  {
    name: 'single-line function returns its expression with positional arguments',
    entry: 'op_=>',
    rule: 'syntax and example: function_result is returned',
    rejects: 'argument reversal, missing second argument, returning a parameter',
    body: `encode(x, y) => x * 10 + y
plot(encode(2, 7), "Result")`,
    expected: allBars(27),
  },
  {
    name: 'multiline function returns its final expression',
    entry: 'op_=>',
    rule: 'example: functions automatically return the last expression',
    rejects: 'first/max/min/sum expression, missing implicit return, parameter substituted',
    body: `choose(x) =>
    8
    -5
    x
plot(choose(3), "Result")`,
    expected: allBars(3),
  },
  {
    name: 'function default arguments apply only to omitted arguments',
    entry: 'op_=>',
    rule: 'syntax: parameter_name may have a default_value',
    rejects: 'ignoring explicit zero, reversed binding, missing default, always using default',
    body: `encode(x, y = 7) => x * 10 + y
plot(encode(2) * 100 + encode(3, 0), "Result")`,
    expected: allBars(2730),
  },
];

function valueSeries(testCase: ValueCase): Array<number | null> {
  const result = runCompatScript(`//@version=6\nindicator("Language values reference")\n${testCase.body}`);
  expect(result.errors).toEqual([]);
  expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
  const values = getPlot(result, 'Result').values;
  expect(values).toHaveLength(compatibilityBars.length);
  return values;
}

describe('Pine v6 language value reference behavior', () => {
  for (const testCase of cases) {
    const title = `${testCase.name} [${reference}#${testCase.entry}; ${testCase.rule}; rejects ${testCase.rejects}]`;
    if (testCase.openDefect) {
      describe(`expected-red ownerLane=language-grammar reason=open-defect openDefect=${testCase.openDefect}`, () => {
        let actual: Array<number | null>;
        beforeAll(() => {
          actual = valueSeries(testCase);
        });
        it.fails(title, () => {
          expect(actual).toEqual(testCase.expected);
        });
      });
    } else {
      it(title, () => {
        expect(valueSeries(testCase)).toEqual(testCase.expected);
      });
    }
  }
});
