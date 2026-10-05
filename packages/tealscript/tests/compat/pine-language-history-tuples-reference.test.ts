import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: archived pine-v6-reference-v1.json (2026-10-03), op_[], op_=>,
// kw_if, kw_switch, kw_for and kw_while; tuple binding also cites the official
// Variable declarations manual. Vectors are independently derived from rules.

// Red proof: shifted history offsets (7), filled missing history (1), and swapped
// tuple binding positions (7). All 15 failed under targeted compiled-emitter
// mutations, then passed after restoring production sources.
const reference = 'https://www.tradingview.com/pine-script-reference/v6/';
const tuplesManual = 'https://www.tradingview.com/pine-script-docs/language/variable-declarations/#tuple-declarations';
const bars = compatibilityBars.slice(0, 6);
const prelude = `values = array.from(-7, 4, 1, 9, -2, -3)
value = array.get(values, bar_index)`;

interface TransportCase {
  name: string;
  entry: string;
  rule: string;
  rejects: string;
  body: string;
  expected: Array<number | null>;
}

const cases: TransportCase[] = [
  {
    name: 'zero history offset returns the current variable value',
    entry: 'op_[]',
    rule: 'description: offset is the number of bars back',
    rejects: 'one-based offsets, stale value, constant initial value',
    body: 'plot(value[0], "Result")',
    expected: [-7, 4, 1, 9, -2, -3],
  },
  {
    name: 'one-bar variable history retains signed nonmonotonic values',
    entry: 'op_[]',
    rule: 'description/example: previous variable value, initially na',
    rejects: 'current value, reverse chronological history, zero fill, initial-value caching',
    body: 'plot(value[1], "Result")',
    expected: [null, -7, 4, 1, 9, -2],
  },
  {
    name: 'two-bar variable history uses the requested distance',
    entry: 'op_[]',
    rule: 'description: expr2 specifies how many bars back',
    rejects: 'one-bar delay, current value, clamp to oldest available value',
    body: 'plot(value[2], "Result")',
    expected: [null, null, -7, 4, 1, 9],
  },
  {
    name: 'unavailable numeric history remains na instead of a filled value',
    entry: 'op_[]',
    rule: 'example: na at the beginning of history',
    rejects: 'zero fill, current value, oldest value, wraparound',
    body: 'plot(na(value[8]) ? 1 : 0, "Result")',
    expected: [1, 1, 1, 1, 1, 1],
  },
  {
    name: 'expression history delays the entire computed expression',
    entry: 'op_[]',
    rule: 'description: previous values of series expr1',
    rejects: 'current expression, subscript applied only to one operand, double evaluation',
    body: 'plot((value * 3 + bar_index)[1], "Result")',
    expected: [null, -21, 13, 5, 30, -2],
  },
  {
    name: 'function-result history retains prior returned values',
    entry: 'op_[]',
    rule: 'description: previous values of series expr1; op_=> returns function_result',
    rejects: 'current result, only one bar of delay, argument substituted for result',
    body: `transform(x) => x * 2 - 3
plot(transform(value)[2], "Result")`,
    expected: [null, null, -17, 5, -1, 15],
  },
  {
    name: 'fractional history offset above one rounds down',
    entry: 'op_[]',
    rule: 'description: floats will be rounded down',
    rejects: 'nearest rounding, ceiling, raw array index, fractional interpolation',
    body: 'plot(value[1.9], "Result")',
    expected: [null, -7, 4, 1, 9, -2],
  },
  {
    name: 'fractional history offset below one rounds down to current',
    entry: 'op_[]',
    rule: 'description: floats will be rounded down',
    rejects: 'nearest rounding, ceiling, minimum offset of one, raw array index',
    body: 'plot(value[0.9], "Result")',
    expected: [-7, 4, 1, 9, -2, -3],
  },
  {
    name: 'function tuple binds each returned element in order',
    entry: 'op_=>',
    rule: `detailedDesc: function_result may be a tuple; ${tuplesManual}`,
    rejects: 'reversed elements, first element repeated, summed or flattened tuple',
    body: `pair(x) => [x * 2 - 3, x + 5]
[first, second] = pair(value)
plot(first * 10 + second, "Result")`,
    expected: [-172, 59, -4, 164, -67, -88],
  },
  {
    name: 'function tuple preserves distinct numeric boolean and string types',
    entry: 'op_=>',
    rule: `detailedDesc: function_result may be a tuple; ${tuplesManual}`,
    rejects: 'homogeneous coercion, reordered elements, discarded boolean or string',
    body: `mixed(x) => [x, x > 0, x < 0 ? "down" : "up"]
[number, flag, text] = mixed(value)
plot(number * 100 + (flag ? 10 : 0) + str.length(text), "Result")`,
    expected: [-696, 412, 112, 912, -196, -296],
  },
  {
    name: 'if tuple binds both elements from the selected branch',
    entry: 'kw_if',
    rule: `detailedDesc: result is the branch tail; ${tuplesManual}`,
    rejects: 'other branch, element reversal, first element repeated, branch element mixing',
    body: `[first, second] = if value > 0
    [value, -3]
else
    [-5, value]
plot(first * 10 + second, "Result")`,
    expected: [-57, 37, 7, 87, -52, -53],
  },
  {
    name: 'switch tuple binds the matching arm or default',
    entry: 'kw_switch',
    rule: `returns/remarks: exactly one matching block supplies its last expression; ${tuplesManual}`,
    rejects: 'default always selected, fallthrough, element reversal, missing arm values',
    body: `[first, second] = switch bar_index
    0 => [-7, 4]
    2 => [9, -2]
    => [1, -3]
plot(first * 10 + second, "Result")`,
    expected: [-66, 7, 88, 7, 7, 7],
  },
  {
    name: 'for tuple returns both elements from the last evaluated iteration',
    entry: 'kw_for',
    rule: 'detailedDesc.variables/return_expression: tuple holds the last evaluation',
    rejects: 'first iteration, maximum element, accumulated tuple, reversed elements',
    body: `[first, second] = for i = 0 to 2
    [array.get(values, i), 9 - i]
plot(first * 10 + second, "Result")`,
    expected: [17, 17, 17, 17, 17, 17],
  },
  {
    name: 'while tuple returns both elements from the last evaluated iteration',
    entry: 'kw_while',
    rule: 'detailedDesc.variables/return_expression: tuple holds the last evaluation',
    rejects: 'first iteration, maximum element, accumulated tuple, reversed elements',
    body: `i = 0
[first, second] = while i < 3
    current = array.get(values, i)
    i += 1
    [current, 10 - i]
plot(first * 10 + second, "Result")`,
    expected: [17, 17, 17, 17, 17, 17],
  },
  {
    name: 'repeated tuple discards preserve positions and evaluate the call once',
    entry: 'op_=>',
    rule: `detailedDesc: tuple function_result; ${tuplesManual}; #using-an-underscore-as-an-identifier`,
    rejects: 'discard positions collapsed, repeated identifier treated as normal binding, repeated call',
    body: `calls = array.new_int()
four(x) =>
    array.push(calls, x)
    [x - 8, x + 3, x * 2, x - 1]
[_, kept, _, _] = four(value)
[_, _, another, _] = four(value)
plot(kept * 100 + another * 10 + array.size(calls), "Result")`,
    expected: [-538, 782, 422, 1382, 62, -58],
  },
];

describe('Pine v6 history and tuple reference behavior', () => {
  for (const testCase of cases) {
    it(`${testCase.name} [${reference}#${testCase.entry}; ${testCase.rule}; rejects ${testCase.rejects}]`, () => {
      const result = runCompatScript(`//@version=6\nindicator("History and tuples reference")\n${prelude}\n${testCase.body}`, { bars });
      expect(result.errors).toEqual([]);
      expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
      const values = getPlot(result, 'Result').values;
      expect(values).toHaveLength(bars.length);
      expect(values).toEqual(testCase.expected);
    });
  }
});
