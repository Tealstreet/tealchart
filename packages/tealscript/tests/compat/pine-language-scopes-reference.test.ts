import { beforeAll, describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: pine-v6-reference-v1.json (2026-10-03), op_:=, kw_var, op_=>
// and op_[]. Function call scopes additionally cite the official UDF manual.
// Signed nonmonotonic vectors distinguish separate, shared and skipped state.

// Red proof: ignored reassignment (1), hidden globals (1), wrong parameter
// binding (1), shared call states (2), reset persistent locals (2), current
// parameter history (1), persistent regular locals (1); nine restored GREEN.

// Inverse proof: creating distinct block bindings after their initializer in
// the discarded source copy passed all thirteen ordinary assertions, including
// all four shadowing expected reds with it.fails disabled.
const reference = 'https://www.tradingview.com/pine-script-reference/v6/';
const functionsManual = 'https://www.tradingview.com/pine-script-docs/language/user-defined-functions/#scope-of-a-function-call';
const bars = compatibilityBars.slice(0, 6);
const prelude = `samples = array.from(-7, 4, 1, 9, -2, -3)
value = array.get(samples, bar_index)`;
const accumulator = `accumulate(source) =>
    var total = 0
    total += source
    total`;

interface ScopeCase {
  name: string;
  entry: string;
  rule: string;
  rejects: string;
  body: string;
  expected: Array<number | null>;
  openDefect?: string;
}

const cases: ScopeCase[] = [
  {
    name: 'local reassignment updates the existing global variable',
    entry: 'op_:=',
    rule: 'description/example: updates the previously declared variable across an if block',
    rejects: 'new local binding, ignored write, branch always or never taken',
    body: `if value > 0
    value := 13
plot(value, "Result")`,
    expected: [-7, 13, 13, 13, -2, -3],
  },
  {
    name: 'regular local declaration reads its local value while preserving a persistent global',
    entry: 'op_:=',
    rule: 'example: a local = declaration creates a new variable and leaves the global unaffected',
    rejects: 'local declaration mutates global, inner read resolves to global, var discarded, escaped shadow',
    body: `var remembered = -7
encoded = 0
if value > 0
    remembered = 4
    encoded := remembered
plot(remembered * 10 + encoded, "Result")`,
    expected: [-70, -66, -66, -66, -70, -70],
  },
  {
    name: 'function reads the current visible global value',
    entry: 'op_=>',
    rule: `remarks linked UDF manual: functions can access earlier global declarations; ${functionsManual}`,
    rejects: 'captured first-bar global, parameter substituted for global, stale value',
    body: `readGlobal(delta) => value * 10 + delta
plot(readGlobal(3), "Result")`,
    expected: [-67, 43, 13, 93, -17, -27],
  },
  {
    name: 'function parameter shadows a global with the same name',
    entry: 'op_=>',
    rule: `syntax/function_result and linked UDF manual: call parameters have local scope; ${functionsManual}`,
    rejects: 'global read instead of argument, argument overwrites global, ignored parameter',
    body: `twice(value) => value * 2
plot(value * 100 + twice(3), "Result")`,
    expected: [-694, 406, 106, 906, -194, -294],
  },
  {
    name: 'distinct written calls maintain independent persistent totals',
    entry: 'op_=>',
    rule: `remarks linked UDF manual: each written call has separate scope and history; ${functionsManual}`,
    rejects: 'one accumulator per function, reset on each bar, shared state between callers',
    body: `${accumulator}
first = accumulate(value)
second = accumulate(2)
plot(first * 10 + second, "Result")`,
    expected: [-68, -26, -14, 78, 60, 32],
  },
  {
    name: 'conditionally evaluated call updates its state only when executed',
    entry: 'op_=>',
    rule: `remarks linked UDF manual: each call updates its own total only when evaluated; ${functionsManual}`,
    rejects: 'eager evaluation of skipped calls, shared state, reset between sparse executions',
    body: `${accumulator}
first = if bar_index == 0 or bar_index == 2 or bar_index == 4
    accumulate(value)
else
    0
second = accumulate(1)
plot(first * 10 + second, "Result")`,
    expected: [-69, 2, -57, 4, -75, 6],
  },
  {
    name: 'one written call in a loop shares its persistent total across iterations',
    entry: 'op_=>',
    rule: `remarks linked UDF manual: loop executions of one written call share one scope; ${functionsManual}`,
    rejects: 'separate state per iteration, only one update per bar, reinitialized accumulator',
    body: `${accumulator}
last = 0
for i = 0 to 2
    last := accumulate(value)
plot(last, "Result")`,
    expected: [-21, -9, -6, 21, 15, 6],
  },
  {
    name: 'sparse function parameter history follows evaluated calls',
    entry: 'op_[]',
    rule: `description previous series values; op_=> linked UDF manual says each call builds history when evaluated; ${functionsManual}`,
    rejects: 'global bar history substituted for local call history, current argument, zero fill',
    body: `previous(source) => source[1]
result = if value > 0
    previous(value)
else
    float(na)
plot(result, "Result")`,
    expected: [null, null, 4, 1, null, null],
  },
  {
    name: 'local var initializes on its first executed bar',
    entry: 'kw_var',
    rule: 'description: one-time initialization; op_=> linked manual gives each call its own scope',
    rejects: 'global first-bar initialization, reinitialization on each execution, initializer ignored',
    body: `remember(source) =>
    var initial = source
    initial
result = if bar_index >= 2
    remember(value)
else
    float(na)
plot(result, "Result")`,
    expected: [null, null, 1, 1, 1, 1],
  },
  {
    name: 'regular function local reinitializes on every call',
    entry: 'kw_var',
    rule: 'description: assignment without var overwrites the value on every update',
    rejects: 'persistent regular local, ignored initializer, reused previous invocation value',
    body: `adjust(source) =>
    local = 3
    local += source
    local
plot(adjust(value), "Result")`,
    expected: [-4, 7, 4, 12, 1, 0],
  },
  {
    name: 'local declaration leaves a regular global with the same name unchanged',
    entry: 'op_:=',
    rule: 'example: = creates a new local variable and does not affect the global',
    rejects: 'local declaration interpreted as reassignment, local binding escapes its block',
    body: `if true
    value = 4
plot(value, "Result")`,
    expected: [-7, 4, 1, 9, -2, -3],
  },
  {
    name: 'reassignment before a later local declaration updates the global',
    entry: 'op_:=',
    rule: 'example: := updates global first; a later = declaration creates a separate local',
    rejects: 'block-wide hoisting of shadow, = interpreted as reassignment, earlier write discarded',
    body: `if true
    value := 13
    value = -3
plot(value, "Result")`,
    expected: [13, 13, 13, 13, 13, 13],
  },
  {
    name: 'nested declarations shadow after their initializer without changing outer values',
    entry: 'op_:=',
    rule: 'example: = creates a distinct local; https://www.tradingview.com/pine-script-docs/language/variable-declarations/#shadowing: shadowing follows declaration, so the initializer uses the earlier visible binding',
    rejects: 'global overwritten, nested binding overwrites parent, hoisted self-reference, escaped shadow',
    body: `encoded = 0
if true
    value = 4
    if true
        value = value - 7
        encoded := value
    encoded := encoded * 10 + value
plot(value * 100 + encoded, "Result")`,
    expected: [-726, 374, 74, 874, -226, -326],
  },
];

function scopeValues(testCase: ScopeCase): Array<number | null> {
  const result = runCompatScript(`//@version=6\nindicator("Scopes reference")\n${prelude}\n${testCase.body}`, { bars });
  expect(result.errors).toEqual([]);
  expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
  const values = getPlot(result, 'Result').values;
  expect(values).toHaveLength(bars.length);
  return values;
}

describe('Pine v6 scope and function-call reference behavior', () => {
  for (const testCase of cases) {
    const title = `${testCase.name} [${reference}#${testCase.entry}; ${testCase.rule}; rejects ${testCase.rejects}]`;
    if (testCase.openDefect) {
      describe(`expected-red ownerLane=language-grammar reason=open-defect openDefect=${testCase.openDefect}`, () => {
        let actual: Array<number | null>;
        beforeAll(() => {
          actual = scopeValues(testCase);
        });
        it.fails(title, () => {
          expect(actual).toEqual(testCase.expected);
        });
      });
    } else {
      it(title, () => {
        expect(scopeValues(testCase)).toEqual(testCase.expected);
      });
    }
  }
});
