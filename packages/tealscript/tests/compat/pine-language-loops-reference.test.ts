import { beforeAll, describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: pine-v6-reference-v1.json, captured 2026-10-03, entries kw_for,
// kw_for...in and kw_while (including detailedDesc, not just their examples).
// Expectations below are derived from those rules, never from engine output.

// Red proof: exclusive endpoints (3), ignored explicit step (1), cached endpoint
// (4), first rather than last tail (4), do-while (1), reversed traversal (4).
// Each targeted mutation failed its tests; restoring the emitter passed all 17.

// Inverse proof: in a discarded source copy, direction-normalized explicit steps,
// refreshed indexed entries, and a first-iteration break for persistent initializers
// passed all 8 then-open assertions with it.fails disabled (25/25 total).
// Lane K now fixes persistent initializers; keep those cases as ordinary tests.
const reference = 'https://www.tradingview.com/pine-script-reference/v6/';

interface LoopCase {
  name: string;
  entry: 'for' | 'for...in' | 'while';
  rule: string;
  rejects: string;
  body: string;
  expected: number | null;
  openDefect?: string;
}

const cases: LoopCase[] = [
  {
    name: 'ascending endpoint is inclusive',
    entry: 'for',
    rule: 'detailedDesc.counter: last possible iteration reaches to_num',
    rejects: 'exclusive endpoint, skipped start, reversed order, unit counter sum',
    body: `encoded = 0
for i = 2 to 4
    encoded := encoded * 10 + i
plot(encoded, "Result")`,
    expected: 234,
  },
  {
    name: 'descending direction is inferred with the default step',
    entry: 'for',
    rule: 'detailedDesc.step_num: subtract when from_num exceeds initial to_num',
    rejects: 'ascending-only loops, exclusive endpoint, reversed visitation',
    body: `encoded = 0
for i = 4 to 2
    encoded := encoded * 10 + i
plot(encoded, "Result")`,
    expected: 432,
  },
  {
    name: 'equal endpoints execute exactly once',
    entry: 'for',
    rule: 'detailedDesc.counter: from_num is the first value and to_num is inclusive',
    rejects: 'zero iterations at equality, duplicate endpoint, wrong initial counter',
    body: `encoded = 1
for i = 3 to 3
    encoded := encoded * 10 + i
plot(encoded, "Result")`,
    expected: 13,
  },
  {
    name: 'positive step skips intermediate counters without overshooting',
    entry: 'for',
    rule: 'detailedDesc.step_num and second example: fixed positive increment',
    rejects: 'ignored step, extra overshoot iteration, endpoint always forced',
    body: `encoded = 0
for i = 2 to 7 by 3
    encoded := encoded * 10 + i
plot(encoded, "Result")`,
    expected: 25,
  },
  {
    name: 'positive explicit step also counts downward',
    entry: 'for',
    rule: 'detailedDesc.step_num: positive magnitude is subtracted on descending loops',
    rejects: 'literal positive increment on descending loops, ignored step, forced endpoint',
    body: `encoded = 0
for i = 7 to 2 by 3
    encoded := encoded * 10 + i
plot(encoded, "Result")`,
    expected: 74,
  },
  {
    name: 'v6 reevaluates an expanded endpoint',
    entry: 'for',
    rule: 'detailedDesc.to_num: modified value controls subsequent iterations',
    rejects: 'cached initial endpoint, repeated start, unconditional extra iteration',
    body: `end = 2
encoded = 0
for i = 1 to end
    if i == 1
        end := 3
    encoded := encoded * 10 + i
plot(encoded, "Result")`,
    expected: 123,
  },
  {
    name: 'v6 reevaluates a contracted endpoint',
    entry: 'for',
    rule: 'detailedDesc.to_num: modified value controls subsequent iterations',
    rejects: 'cached endpoint, boundary update delayed by one iteration',
    body: `end = 5
encoded = 0
for i = 1 to end
    end := 2
    encoded := encoded * 10 + i
plot(encoded, "Result")`,
    expected: 12,
  },
  {
    name: 'upward direction stays fixed when the endpoint crosses the start',
    entry: 'for',
    rule: 'remarks[0]: direction never changes when to_num is modified',
    rejects: 'recomputed direction, early exit before finishing the current body',
    body: `end = 5
encoded = 0
for i = 2 to end
    end := 1
    encoded := encoded * 10 + i
plot(encoded, "Result")`,
    expected: 2,
  },
  {
    name: 'downward direction stays fixed when the endpoint crosses the start',
    entry: 'for',
    rule: 'remarks[0]: a descending loop stops after the current iteration',
    rejects: 'recomputed direction, ignoring endpoint edits, unfinished current body',
    body: `end = 1
encoded = 0
for i = 4 to end
    end := 6
    encoded := encoded * 10 + i
plot(encoded, "Result")`,
    expected: 4,
  },
  {
    name: 'loop result is the last tail value rather than its maximum or sum',
    entry: 'for',
    rule: 'detailedDesc.return_expression: return the final evaluated tail',
    rejects: 'maximum, minimum, first value, sum, counter instead of tail',
    body: `values = array.from(8, -5, 3)
result = for i = 0 to 2
    array.get(values, i)
plot(result, "Result")`,
    expected: 3,
  },
  {
    name: 'break retains the most recent evaluated tail',
    entry: 'for',
    rule: 'detailedDesc.break and return_expression: exit before the remaining body',
    rejects: 'break treated as continue, evaluating the break iteration tail, returning na',
    body: `values = array.from(8, -5, 3)
result = for i = 0 to 2
    if i == 2
        break
    array.get(values, i)
plot(result, "Result")`,
    expected: -5,
  },
  {
    name: 'continue skips its tail but permits later iterations',
    entry: 'for',
    rule: 'detailedDesc.continue and return_expression: skip the remaining body',
    rejects: 'continue treated as break or ignored, sum or maximum instead of last tail',
    body: `values = array.from(8, -5, 3, -2)
result = for i = 0 to 3
    if i == 1 or i == 3
        continue
    array.get(values, i)
plot(result, "Result")`,
    expected: 3,
  },
  {
    name: 'while tests its condition before the first iteration',
    entry: 'while',
    rule: 'detailedDesc.condition: false exits without an iteration',
    rejects: 'do-while execution, returning zero or an unevaluated tail',
    body: `result = while false
    7
plot(result, "Result")`,
    expected: null,
  },
  {
    name: 'while reevaluates its condition and returns the last tail',
    entry: 'while',
    rule: 'description and detailedDesc.return_expression',
    rejects: 'cached condition, one extra iteration, first/max/min/sum as result',
    body: `values = array.from(8, -5, 3)
index = 0
result = while index < 3
    value = array.get(values, index)
    index += 1
    value
plot(result, "Result")`,
    expected: 3,
  },
  {
    name: 'for-in visits array elements in order',
    entry: 'for...in',
    rule: 'description: execute once per element, in order',
    rejects: 'sorting, reverse order, index substituted for value, repeated first element',
    body: `values = array.from(4, 1, 7)
encoded = 0
for value in values
    encoded := encoded * 10 + value
plot(encoded, "Result")`,
    expected: 417,
  },
  {
    name: 'indexed for-in binds the index and value separately',
    entry: 'for...in',
    rule: 'second form and array second-form example: [index, element]',
    rejects: 'swapped bindings, one-based indices, sorting or reverse traversal',
    body: `values = array.from(4, 1, 7)
encoded = 0
for [index, value] in values
    encoded := encoded * 100 + index * 10 + value
plot(encoded, "Result")`,
    expected: 41127,
  },
  {
    name: 'for-in observes array growth during iteration',
    entry: 'for...in',
    rule: 'remarks[1]; https://www.tradingview.com/pine-script-docs/language/loops/#forin-loops: updated size controls subsequent iterations',
    rejects: 'snapshot size, snapshot elements, repeated append, wrong visitation order',
    body: `values = array.from(4, 1)
encoded = 0
for value in values
    if value == 4
        array.push(values, 7)
    encoded := encoded * 10 + value
plot(encoded, "Result")`,
    expected: 417,
  },
  {
    name: 'indexed for-in observes array growth during iteration',
    entry: 'for...in',
    rule: 'remarks[1]; https://www.tradingview.com/pine-script-docs/language/loops/#forin-loops: updated size controls subsequent iterations in both forms',
    rejects: 'snapshot entries, swapped bindings, one-based indices',
    body: `values = array.from(4, 1)
encoded = 0
for [index, value] in values
    if index == 0
        array.push(values, 7)
    encoded := encoded * 100 + index * 10 + value
plot(encoded, "Result")`,
    expected: 41127,
  },
  {
    name: 'map for-in follows key insertion order',
    entry: 'for...in',
    rule: 'remarks[0]: map pairs are visited in insertion order of keys',
    rejects: 'key sorting, value sorting, reverse order, duplicate entry after update',
    body: `values = map.new<string, int>()
map.put(values, "z", 4)
map.put(values, "a", 1)
map.put(values, "m", 7)
map.put(values, "a", 2)
encoded = 0
for [key, value] in values
    encoded := encoded * 10 + value
plot(encoded, "Result")`,
    expected: 427,
  },
];

for (const kind of ['var', 'varip'] as const) {
  for (const entry of ['for', 'for...in', 'while'] as const) {
    const loop = entry === 'for'
      ? `for index = 0 to 2\n    visits += 1\n    array.get(values, index)`
      : entry === 'for...in'
        ? `for value in values\n    visits += 1\n    value`
        : `while index < 3\n    value = array.get(values, index)\n    index += 1\n    visits += 1\n    value`;
    cases.push({
      name: `${kind} initializer stops ${entry} after the first iteration`,
      entry,
      rule: 'remarks: direct var/varip initialization stops after the first iteration',
      rejects: 'full loop, last/max/min/sum result, first value selected without stopping side effects',
      body: `values = array.from(5, -4, 2)
var visits = 0
index = 0
${kind} result = ${loop}
plot(result * 100 + visits, "Result")`,
      expected: 501,
    });
  }
}

function loopValues(testCase: LoopCase): Array<number | null> {
  const result = runCompatScript(`//@version=6\nindicator("Loop reference")\n${testCase.body}`);
  expect(result.errors).toEqual([]);
  expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
  const values = getPlot(result, 'Result').values;
  expect(values).toHaveLength(compatibilityBars.length);
  return values;
}

describe('Pine v6 loop reference behavior', () => {
  for (const testCase of cases) {
    const title = `${testCase.name} [${reference}#kw_${testCase.entry}; ${testCase.rule}; rejects ${testCase.rejects}]`;
    const expected = compatibilityBars.map(() => testCase.expected);
    if (testCase.openDefect) {
      // Same named open-defect/owner-lane convention as the value-vector register.
      // Keep execution/shape checks outside it.fails: an unrelated crash must fail
      // the suite, not masquerade as the documented value defect.
      describe(`expected-red ownerLane=language-grammar reason=open-defect openDefect=${testCase.openDefect}`, () => {
        let actual: Array<number | null>;
        beforeAll(() => {
          actual = loopValues(testCase);
        });
        it.fails(title, () => {
          expect(actual).toEqual(expected);
        });
      });
    } else {
      it(title, () => {
        expect(loopValues(testCase)).toEqual(expected);
      });
    }
  }
});
