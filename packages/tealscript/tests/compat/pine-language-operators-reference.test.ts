import { beforeAll, describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: 2026-10-03 pine-v6-reference-v1.json operator entries. Expectations
// are independent arithmetic derivations of those entries, not engine captures.
// Signed, unequal, fractional and equal operands distinguish operator swaps,

// reversed operands, integer division, absolute values and strict boundaries.
// Red proof: wrong binary operators (5), wrong compound operators (5), na
// coerced to zero (4), inverted comparisons (6), reversed unary signs (2),

// reversed ternary selection (1). All 23 failed, then passed after restoration.
// Inverse proof: nine-digit operand rounding in a discarded source copy passed
// all 25 ordinary assertions, including both expected reds with it.fails disabled.
const reference = 'https://www.tradingview.com/pine-script-reference/v6/';
const bars = compatibilityBars.slice(0, 6);
const operands = `left = array.from(-7, 4, 1, 9, -2, -3)
right = array.from(3, -5, 4, 2, -2, 3)
a = array.get(left, bar_index)
b = array.get(right, bar_index)`;

interface OperatorCase {
  name: string;
  entry: string;
  rule: string;
  rejects: string;
  body: string;
  expected: Array<number | null>;
  openDefect?: string;
}

const arithmetic = [
  { operator: '+', expected: [-4, -1, 5, 11, -4, 0] },
  { operator: '-', expected: [-10, 9, -3, 7, 0, -6] },
  { operator: '*', expected: [-21, -20, 4, 18, 4, -9] },
  { operator: '/', expected: [-2.3333333333333335, -0.8, 0.25, 4.5, 1, -1] },
];

const cases: OperatorCase[] = arithmetic.flatMap(({ operator, expected }) => [
  {
    name: `binary ${operator} acts elementwise on signed numeric values`,
    entry: operator,
    rule: operator === '/'
      ? 'description/returns; https://www.tradingview.com/pine-script-docs/language/operators/#arithmetic-operators: integer division retains the fractional value'
      : 'description/returns: documented numeric operation on each series element',
    rejects: 'wrong operator, reversed subtraction/division, integer rounding, absolute values',
    body: `plot(a ${operator} b, "Result")`,
    expected,
  },
  {
    name: `compound ${operator}= updates the existing value`,
    entry: `${operator}=`,
    rule: operator === '/'
      ? 'description/example; https://www.tradingview.com/pine-script-docs/language/operators/#arithmetic-operators: division assignment retains fractional values'
      : 'description/example: apply the operation to the existing value and assign its result',
    rejects: 'RHS-only reassignment, wrong compound operator, ignoring the update, integer rounding',
    body: `value = a
value ${operator}= b
plot(value, "Result")`,
    expected,
  },
  {
    name: `numeric ${operator} propagates na from either operand`,
    entry: operator,
    rule: 'https://www.tradingview.com/pine-script-docs/language/operators/#arithmetic-operators: an na operand produces na',
    rejects: 'na coerced to zero, dropped operand, infinity mistaken for na',
    body: `plot((na(a ${operator} na) ? 1 : 0) + (na(na ${operator} a) ? 2 : 0), "Result")`,
    expected: [3, 3, 3, 3, 3, 3],
  },
]);

for (const { operator, expected } of [
  { operator: '==', expected: [0, 0, 0, 0, 1, 0] },
  { operator: '!=', expected: [1, 1, 1, 1, 0, 1] },
  { operator: '>', expected: [0, 1, 0, 1, 0, 0] },
  { operator: '<', expected: [1, 0, 1, 0, 0, 1] },
  { operator: '>=', expected: [0, 1, 0, 1, 1, 0] },
  { operator: '<=', expected: [1, 0, 1, 0, 1, 1] },
]) {
  cases.push({
    name: `comparison ${operator} handles signed values and equal boundaries`,
    entry: operator,
    rule: 'description/returns: documented numeric comparison',
    rejects: 'inverted relation, ignored sign, strict/inclusive boundary swap, constant result',
    body: `plot(a ${operator} b ? 1 : 0, "Result")`,
    expected,
  });
}

cases.push(
  {
    name: 'unary plus preserves the numeric value',
    entry: '+',
    rule: 'returns: unary plus returns expr unchanged',
    rejects: 'negation, absolute value, numeric value replaced by boolean',
    body: 'plot(+a, "Result")',
    expected: [-7, 4, 1, 9, -2, -3],
  },
  {
    name: 'unary minus negates the numeric value',
    entry: '-',
    rule: 'returns: unary minus returns the negation of expr',
    rejects: 'identity, absolute value, numeric value replaced by boolean',
    body: 'plot(-a, "Result")',
    expected: [7, -4, -1, -9, 2, 3],
  },
  {
    name: 'binary plus concatenates strings in operand order',
    entry: '+',
    rule: 'returns: binary plus for strings concatenates expr1 and expr2',
    rejects: 'reversed concatenation, numeric coercion, one operand discarded',
    body: `value = "pine" + "script"
plot(value == "pinescript" ? 1 : 0, "Result")`,
    expected: [1, 1, 1, 1, 1, 1],
  },
  {
    name: 'compound plus concatenates onto the existing string',
    entry: '+=',
    rule: 'description/returns: string addition assignment concatenates the operands',
    rejects: 'RHS-only assignment, reversed concatenation, numeric coercion, missing write',
    body: `value = "pine"
value += "script"
plot(value == "pinescript" ? 1 : 0, "Result")`,
    expected: [1, 1, 1, 1, 1, 1],
  },
  {
    name: 'chained ternary returns the selected nested branch',
    entry: '?:',
    rule: 'returns/example: expr2 when true, expr3 otherwise; ternaries can be combined',
    rejects: 'inverted condition, first branch always selected, wrong nested association',
    body: 'plot(a > 0 ? b > 0 ? 8 : -5 : 3, "Result")',
    expected: [3, -5, 8, 8, 3, 3],
  },
);

for (const { operator, expected } of [
  { operator: '==', expected: [0, 1, 0, 1, 1, 0] },
  { operator: '!=', expected: [1, 0, 1, 0, 0, 1] },
]) {
  cases.push({
    name: `comparison ${operator} uses captured inclusive absolute 1e-10 comparison`,
    entry: operator,
    rule: 'DOC-CONFLICT-NATIVE-WINS: confirmed comparator uses inclusive absolute 1e-10',
    rejects: 'raw equality, operand rounding, strict tolerance endpoint, ignoring negative sign',
    body: `x = array.from(1.0000000001, 1.00000000049, -1.0000000001, -1.00000000049, 2.0, -1.0000000001)
y = array.from(1.0000000004, 1.00000000051, -1.0000000004, -1.00000000051, 2.0, 1.0000000001)
plot(array.get(x, bar_index) ${operator} array.get(y, bar_index) ? 1 : 0, "Result")`,
    expected,
  });
}

function operatorValues(testCase: OperatorCase): Array<number | null> {
  const result = runCompatScript(`//@version=6\nindicator("Operators reference")\n${operands}\n${testCase.body}`, { bars });
  expect(result.errors).toEqual([]);
  expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
  const values = getPlot(result, 'Result').values;
  expect(values).toHaveLength(bars.length);
  return values;
}

describe('Pine v6 operator reference behavior', () => {
  for (const testCase of cases) {
    const title = `${testCase.name} [${reference}#op_${testCase.entry}; ${testCase.rule}; rejects ${testCase.rejects}]`;
    if (testCase.openDefect) {
      describe(`expected-red ownerLane=language-grammar reason=open-defect openDefect=${testCase.openDefect}`, () => {
        let actual: Array<number | null>;
        beforeAll(() => {
          actual = operatorValues(testCase);
        });
        it.fails(title, () => {
          expect(actual).toEqual(testCase.expected);
        });
      });
    } else {
      it(title, () => {
        expect(operatorValues(testCase)).toEqual(testCase.expected);
      });
    }
  }
});
